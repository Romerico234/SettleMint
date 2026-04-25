package settlementpayments

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/big"
	"strings"
	"time"

	"settlemint-service/internal/core/config"
	"settlemint-service/internal/modules/auth"
	settlementplan "settlemint-service/internal/modules/settlement-plan"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

const (
	recordSettlementPaymentSelector = "45d5d040"
	settlementRecordedTopic         = "0x10141f784d84c0d2af8353180f370f51d9218107ded9d95d65be2b5c552cb605"
)

var (
	ErrGroupMembershipRequired = errors.New("you are not a member of this group")
	ErrCycleNotFound           = errors.New("settlement cycle not found")
	ErrInvalidAmount           = errors.New("amount must be greater than 0")
	ErrInvalidAmountPrecision  = errors.New("amount must use at most two decimal places")
	ErrInvalidWallet           = errors.New("payer and payee wallets must be valid EVM addresses")
	ErrPayerMustSubmit         = errors.New("only the payer wallet can submit this settlement payment")
	ErrInvalidTransactionHash  = errors.New("transaction hash must be a valid EVM transaction hash")
	ErrInvalidNativeAmount     = errors.New("native amount base units must be greater than 0")
	ErrInvalidChain            = errors.New("submitted chain does not match the configured settlement chain")
	ErrObligationNotFound      = errors.New("matching unpaid settlement obligation was not found")
)

type Service struct {
	store                  *Store
	plan                   *settlementplan.Service
	network                string
	rpcURL                 string
	chainID                *big.Int
	settlementProofAddress string
}

func NewService(store *Store, plan *settlementplan.Service, cfg config.Config) *Service {
	return &Service{
		store:                  store,
		plan:                   plan,
		network:                strings.TrimSpace(cfg.SettlementNetwork),
		rpcURL:                 strings.TrimSpace(cfg.SettlementRPCURL),
		chainID:                big.NewInt(cfg.SettlementChainID),
		settlementProofAddress: normalizeWalletAddress(cfg.SettlementProofAddress),
	}
}

func (s *Service) SubmitPayment(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
	input SubmitPaymentRequest,
) (Payment, error) {
	groupID = strings.TrimSpace(groupID)
	cycleID = strings.TrimSpace(cycleID)
	input.PayerWallet = normalizeWalletAddress(input.PayerWallet)
	input.PayeeWallet = normalizeWalletAddress(input.PayeeWallet)
	input.TxHash = strings.ToLower(strings.TrimSpace(input.TxHash))
	input.ChainNetwork = strings.TrimSpace(input.ChainNetwork)
	input.NativeAmountBaseUnits = strings.TrimSpace(input.NativeAmountBaseUnits)

	if input.PayerWallet == "" || input.PayeeWallet == "" || input.PayerWallet == input.PayeeWallet {
		return Payment{}, ErrInvalidWallet
	}
	if normalizeWalletAddress(authUser.WalletAddress) != input.PayerWallet {
		return Payment{}, ErrPayerMustSubmit
	}
	if !isTransactionHash(input.TxHash) {
		return Payment{}, ErrInvalidTransactionHash
	}
	if input.ChainNetwork != s.network || input.ChainID != s.chainID.Int64() {
		return Payment{}, ErrInvalidChain
	}
	if _, ok := new(big.Int).SetString(input.NativeAmountBaseUnits, 10); !ok {
		return Payment{}, ErrInvalidNativeAmount
	}
	if nativeAmount, _ := new(big.Int).SetString(input.NativeAmountBaseUnits, 10); nativeAmount.Sign() <= 0 {
		return Payment{}, ErrInvalidNativeAmount
	}

	obligationCents, err := currencyToCents(input.USDObligationAmount)
	if err != nil {
		return Payment{}, err
	}

	summary, err := s.plan.BuildSummary(ctx, authUser, groupID, cycleID)
	if err != nil {
		if errors.Is(err, settlementplan.ErrGroupMembershipRequired) {
			return Payment{}, ErrGroupMembershipRequired
		}
		if errors.Is(err, settlementplan.ErrCycleNotFound) {
			return Payment{}, ErrCycleNotFound
		}
		return Payment{}, err
	}
	if !hasMatchingObligation(summary, input.PayerWallet, input.PayeeWallet, obligationCents) {
		return Payment{}, ErrObligationNotFound
	}

	now := time.Now().UTC()
	payment := Payment{
		GroupID:               groupID,
		CycleID:               cycleID,
		PayerWallet:           input.PayerWallet,
		PayeeWallet:           input.PayeeWallet,
		USDObligationAmount:   centsToCurrency(obligationCents),
		USDObligationCents:    obligationCents,
		TxHash:                input.TxHash,
		ChainNetwork:          input.ChainNetwork,
		ChainID:               input.ChainID,
		NativeAmountBaseUnits: input.NativeAmountBaseUnits,
		Quote:                 normalizeQuote(input.Quote),
		Status:                PaymentStatusSubmitted,
		SubmittedAt:           now,
		CreatedAt:             now,
		UpdatedAt:             now,
	}

	payment, err = s.store.InsertPayment(ctx, payment)
	if err != nil {
		return Payment{}, err
	}

	result := s.verifyPaymentOnChain(ctx, payment)
	payment.Status = result.Status
	payment.VerificationMessage = result.Message
	if result.Status == PaymentStatusVerified {
		verifiedAt := time.Now().UTC()
		payment.VerifiedAt = &verifiedAt
	}

	return s.store.UpdateVerification(ctx, payment)
}

func (s *Service) ListPayments(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
) ([]Payment, error) {
	return s.store.ListPayments(ctx, authUser, strings.TrimSpace(groupID), strings.TrimSpace(cycleID))
}

type verificationResult struct {
	Status  PaymentStatus
	Message string
}

func (s *Service) verifyPaymentOnChain(ctx context.Context, payment Payment) verificationResult {
	if s.network == "" || payment.ChainNetwork != s.network {
		return verificationResult{
			Status:  PaymentStatusRejected,
			Message: "transaction was submitted for the wrong settlement network",
		}
	}
	if payment.ChainID != s.chainID.Int64() {
		return verificationResult{
			Status:  PaymentStatusRejected,
			Message: "transaction was submitted for the wrong chain",
		}
	}
	if s.settlementProofAddress == "" {
		return verificationResult{
			Status:  PaymentStatusSubmitted,
			Message: "SettlementProof contract address is not configured",
		}
	}
	if s.rpcURL == "" {
		return verificationResult{
			Status:  PaymentStatusSubmitted,
			Message: "chain RPC is not configured yet",
		}
	}

	client, err := ethclient.DialContext(ctx, s.rpcURL)
	if err != nil {
		return verificationResult{
			Status:  PaymentStatusSubmitted,
			Message: "chain RPC is unavailable",
		}
	}
	defer client.Close()

	networkChainID, err := client.ChainID(ctx)
	if err != nil {
		return verificationResult{
			Status:  PaymentStatusSubmitted,
			Message: "chain ID could not be read from RPC",
		}
	}
	if networkChainID.Cmp(s.chainID) != 0 {
		return verificationResult{
			Status:  PaymentStatusRejected,
			Message: "configured RPC is connected to a different chain",
		}
	}

	txHash := common.HexToHash(payment.TxHash)
	transaction, _, err := client.TransactionByHash(ctx, txHash)
	if err != nil {
		if errors.Is(err, ethereum.NotFound) {
			return verificationResult{
				Status:  PaymentStatusSubmitted,
				Message: "transaction has not been found on-chain yet",
			}
		}
		return verificationResult{
			Status:  PaymentStatusSubmitted,
			Message: "transaction lookup failed",
		}
	}

	receipt, err := client.TransactionReceipt(ctx, txHash)
	if err != nil {
		if errors.Is(err, ethereum.NotFound) {
			return verificationResult{
				Status:  PaymentStatusSubmitted,
				Message: "transaction receipt is not available yet",
			}
		}
		return verificationResult{
			Status:  PaymentStatusSubmitted,
			Message: "transaction receipt lookup failed",
		}
	}
	if receipt.Status != types.ReceiptStatusSuccessful {
		return verificationResult{
			Status:  PaymentStatusRejected,
			Message: "transaction receipt failed",
		}
	}

	sender, err := types.Sender(types.LatestSignerForChainID(s.chainID), transaction)
	if err != nil {
		return verificationResult{
			Status:  PaymentStatusRejected,
			Message: "transaction sender could not be recovered",
		}
	}
	if strings.ToLower(sender.Hex()) != payment.PayerWallet {
		return verificationResult{
			Status:  PaymentStatusRejected,
			Message: "transaction sender does not match payer wallet",
		}
	}

	if transaction.To() == nil || strings.ToLower(transaction.To().Hex()) != s.settlementProofAddress {
		return verificationResult{
			Status:  PaymentStatusRejected,
			Message: "transaction target does not match SettlementProof contract",
		}
	}

	expectedValue, ok := new(big.Int).SetString(payment.NativeAmountBaseUnits, 10)
	if !ok || expectedValue.Sign() <= 0 {
		return verificationResult{
			Status:  PaymentStatusRejected,
			Message: "expected native transfer amount is invalid",
		}
	}
	if transaction.Value().Cmp(expectedValue) != 0 {
		return verificationResult{
			Status:  PaymentStatusRejected,
			Message: fmt.Sprintf("native transfer amount mismatch: expected %s, got %s", expectedValue.String(), transaction.Value().String()),
		}
	}
	if err := verifySettlementProofCall(transaction.Data(), payment.PayeeWallet); err != nil {
		return verificationResult{
			Status:  PaymentStatusRejected,
			Message: err.Error(),
		}
	}
	if !receiptIncludesSettlementRecord(receipt, s.settlementProofAddress) {
		return verificationResult{
			Status:  PaymentStatusRejected,
			Message: "SettlementProof record event was not found in receipt",
		}
	}

	return verificationResult{
		Status:  PaymentStatusVerified,
		Message: "Settlement payment verified on-chain",
	}
}

func verifySettlementProofCall(data []byte, payeeWallet string) error {
	if len(data) != 4+32+32+32 {
		return errors.New("SettlementProof call data has an unexpected size")
	}
	if common.Bytes2Hex(data[:4]) != recordSettlementPaymentSelector {
		return errors.New("transaction did not call SettlementProof.recordSettlementPayment")
	}

	encodedPayee := common.BytesToAddress(data[4+32+32 : 4+32+32+32]).Hex()
	if strings.ToLower(encodedPayee) != payeeWallet {
		return errors.New("SettlementProof payee argument does not match obligation payee")
	}

	return nil
}

func receiptIncludesSettlementRecord(receipt *types.Receipt, settlementProofAddress string) bool {
	for _, logEntry := range receipt.Logs {
		if strings.ToLower(logEntry.Address.Hex()) != settlementProofAddress {
			continue
		}
		if len(logEntry.Topics) == 0 {
			continue
		}
		if strings.ToLower(logEntry.Topics[0].Hex()) == settlementRecordedTopic {
			return true
		}
	}

	return false
}

func hasMatchingObligation(summary settlementplan.Summary, payer string, payee string, amountCents int64) bool {
	paidCents := int64(0)
	for _, payment := range summary.Payments {
		if payment.Status == "Rejected" {
			continue
		}
		if strings.ToLower(payment.PayerWallet) != payer {
			continue
		}
		if strings.ToLower(payment.PayeeWallet) != payee {
			continue
		}
		paidCents += int64(math.Round(payment.USDObligationAmount * 100))
	}

	for _, settlement := range summary.Settlements {
		if strings.ToLower(settlement.FromWalletAddress) != payer {
			continue
		}
		if strings.ToLower(settlement.ToWalletAddress) != payee {
			continue
		}
		remainingCents := int64(math.Round(settlement.Amount*100)) - paidCents
		if remainingCents > 0 && remainingCents == amountCents {
			return true
		}
	}

	return false
}

func normalizeQuote(quote *PaymentQuote) *PaymentQuote {
	if quote == nil {
		return nil
	}

	nextQuote := *quote
	if nextQuote.FetchedAt.IsZero() {
		nextQuote.FetchedAt = time.Now().UTC()
	}
	return &nextQuote
}

func isTransactionHash(value string) bool {
	if !strings.HasPrefix(value, "0x") || len(value) != 66 {
		return false
	}
	for _, character := range value[2:] {
		if (character >= '0' && character <= '9') ||
			(character >= 'a' && character <= 'f') ||
			(character >= 'A' && character <= 'F') {
			continue
		}
		return false
	}
	return true
}

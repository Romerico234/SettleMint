package settlementplan

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"settlemint-service/internal/modules/auth"
)

var (
	ErrGroupMembershipRequired = errors.New("you are not a member of this group")
	ErrCycleNotFound           = errors.New("settlement cycle not found")
)

type Service struct {
	store *Store
}

func NewService(store *Store) *Service {
	return &Service{store: store}
}

func (s *Service) BuildSummary(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
) (Summary, error) {
	members, expenses, splitsByExpenseID, err := s.store.LoadCycleData(
		ctx,
		authUser,
		strings.TrimSpace(groupID),
		strings.TrimSpace(cycleID),
	)
	if err != nil {
		return Summary{}, err
	}

	memberBalances, totalExpensesCents := calculateBalances(members, expenses, splitsByExpenseID)
	settlements := buildSettlementPlan(memberBalances)
	payments, err := s.store.LoadCyclePayments(ctx, strings.TrimSpace(groupID), strings.TrimSpace(cycleID))
	if err != nil {
		return Summary{}, err
	}
	memberBalances = applyPaymentsToMemberBalances(memberBalances, payments)
	settlements = applyPaymentStatus(settlements, payments)

	sort.Slice(memberBalances, func(leftIndex int, rightIndex int) bool {
		left := memberBalances[leftIndex]
		right := memberBalances[rightIndex]
		if left.Balance == right.Balance {
			return left.WalletAddress < right.WalletAddress
		}
		return left.Balance > right.Balance
	})

	summary := Summary{
		Members:       memberBalances,
		Settlements:   settlements,
		Payments:      payments,
		TotalExpenses: centsToCurrency(totalExpensesCents),
		ExpenseCount:  len(expenses),
	}

	return summary, nil
}

type memberSnapshot struct {
	WalletAddress string
	DisplayName   string
}

type expenseSnapshot struct {
	ID           string
	PaidByWallet string
	AmountCents  int64
}

type splitSnapshot struct {
	WalletAddress string
	AmountCents   int64
}

func calculateBalances(
	members []memberSnapshot,
	expenses []expenseSnapshot,
	splitsByExpenseID map[string][]splitSnapshot,
) ([]MemberBalance, int64) {
	totalPaidByWallet := make(map[string]int64, len(members))
	totalOwedByWallet := make(map[string]int64, len(members))
	totalExpensesCents := int64(0)

	for _, expense := range expenses {
		totalExpensesCents += expense.AmountCents
		totalPaidByWallet[expense.PaidByWallet] += expense.AmountCents

		for _, split := range splitsByExpenseID[expense.ID] {
			totalOwedByWallet[split.WalletAddress] += split.AmountCents
		}
	}

	balances := make([]MemberBalance, 0, len(members))
	for _, member := range members {
		totalPaid := totalPaidByWallet[member.WalletAddress]
		totalOwed := totalOwedByWallet[member.WalletAddress]
		balance := totalPaid - totalOwed

		balances = append(balances, MemberBalance{
			WalletAddress: member.WalletAddress,
			DisplayName:   member.DisplayName,
			TotalPaid:     centsToCurrency(totalPaid),
			TotalOwed:     centsToCurrency(totalOwed),
			Balance:       centsToCurrency(balance),
		})
	}

	return balances, totalExpensesCents
}

func buildSettlementPlan(balances []MemberBalance) []Settlement {
	type participantBalance struct {
		WalletAddress string
		DisplayName   string
		BalanceCents  int64
	}

	creditors := make([]participantBalance, 0)
	debtors := make([]participantBalance, 0)

	for _, balance := range balances {
		balanceCents := currencyToCents(balance.Balance)
		if balanceCents > 0 {
			creditors = append(creditors, participantBalance{
				WalletAddress: balance.WalletAddress,
				DisplayName:   balance.DisplayName,
				BalanceCents:  balanceCents,
			})
		}
		if balanceCents < 0 {
			debtors = append(debtors, participantBalance{
				WalletAddress: balance.WalletAddress,
				DisplayName:   balance.DisplayName,
				BalanceCents:  -balanceCents,
			})
		}
	}

	sort.Slice(creditors, func(leftIndex int, rightIndex int) bool {
		left := creditors[leftIndex]
		right := creditors[rightIndex]
		if left.BalanceCents == right.BalanceCents {
			return left.WalletAddress < right.WalletAddress
		}
		return left.BalanceCents > right.BalanceCents
	})
	sort.Slice(debtors, func(leftIndex int, rightIndex int) bool {
		left := debtors[leftIndex]
		right := debtors[rightIndex]
		if left.BalanceCents == right.BalanceCents {
			return left.WalletAddress < right.WalletAddress
		}
		return left.BalanceCents > right.BalanceCents
	})

	settlements := make([]Settlement, 0)
	debtorIndex := 0
	creditorIndex := 0

	for debtorIndex < len(debtors) && creditorIndex < len(creditors) {
		debtor := &debtors[debtorIndex]
		creditor := &creditors[creditorIndex]

		amountCents := debtor.BalanceCents
		if creditor.BalanceCents < amountCents {
			amountCents = creditor.BalanceCents
		}

		settlements = append(settlements, Settlement{
			ID:                settlementID(len(settlements) + 1),
			FromWalletAddress: debtor.WalletAddress,
			FromDisplayName:   debtor.DisplayName,
			ToWalletAddress:   creditor.WalletAddress,
			ToDisplayName:     creditor.DisplayName,
			Amount:            centsToCurrency(amountCents),
			Status:            "Pending",
		})

		debtor.BalanceCents -= amountCents
		creditor.BalanceCents -= amountCents

		if debtor.BalanceCents == 0 {
			debtorIndex++
		}
		if creditor.BalanceCents == 0 {
			creditorIndex++
		}
	}

	return settlements
}

func settlementID(value int) string {
	return fmt.Sprintf("stl_%02d", value)
}

func applyPaymentStatus(settlements []Settlement, payments []PaymentRecord) []Settlement {
	verifiedCentsByPair := make(map[string]int64)
	submittedCentsByPair := make(map[string]int64)

	for _, payment := range payments {
		if payment.Status == "Rejected" {
			continue
		}

		pairKey := paymentPairKey(payment.PayerWallet, payment.PayeeWallet)
		amountCents := currencyToCents(payment.USDObligationAmount)
		submittedCentsByPair[pairKey] += amountCents
		if payment.Status == "Verified" {
			verifiedCentsByPair[pairKey] += amountCents
		}
	}

	nextSettlements := make([]Settlement, 0, len(settlements))
	for _, settlement := range settlements {
		pairKey := paymentPairKey(settlement.FromWalletAddress, settlement.ToWalletAddress)
		amountCents := currencyToCents(settlement.Amount)
		switch {
		case verifiedCentsByPair[pairKey] >= amountCents:
			settlement.Status = "Verified"
		case submittedCentsByPair[pairKey] >= amountCents:
			settlement.Status = "Submitted"
		default:
			settlement.Status = "Pending"
		}
		nextSettlements = append(nextSettlements, settlement)
	}

	return nextSettlements
}

func paymentPairKey(payerWallet string, payeeWallet string) string {
	return strings.ToLower(payerWallet) + "->" + strings.ToLower(payeeWallet)
}

func applyPaymentsToMemberBalances(memberBalances []MemberBalance, payments []PaymentRecord) []MemberBalance {
	paidCentsByWallet := make(map[string]int64)
	receivedCentsByWallet := make(map[string]int64)

	for _, payment := range payments {
		if payment.Status == "Rejected" {
			continue
		}

		amountCents := currencyToCents(payment.USDObligationAmount)
		paidCentsByWallet[strings.ToLower(payment.PayerWallet)] += amountCents
		receivedCentsByWallet[strings.ToLower(payment.PayeeWallet)] += amountCents
	}

	adjustedBalances := make([]MemberBalance, 0, len(memberBalances))
	for _, memberBalance := range memberBalances {
		walletAddress := strings.ToLower(memberBalance.WalletAddress)
		paidCents := paidCentsByWallet[walletAddress]
		receivedCents := receivedCentsByWallet[walletAddress]
		totalPaidCents := currencyToCents(memberBalance.TotalPaid) + paidCents
		totalOwedCents := currencyToCents(memberBalance.TotalOwed) - paidCents
		if totalOwedCents < 0 {
			totalOwedCents = 0
		}
		balanceCents := currencyToCents(memberBalance.Balance) + paidCents - receivedCents

		memberBalance.TotalPaid = centsToCurrency(totalPaidCents)
		memberBalance.TotalOwed = centsToCurrency(totalOwedCents)
		memberBalance.Balance = centsToCurrency(balanceCents)
		adjustedBalances = append(adjustedBalances, memberBalance)
	}

	return adjustedBalances
}

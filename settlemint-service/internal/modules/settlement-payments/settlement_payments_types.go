package settlementpayments

import "time"

type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "Pending"
	PaymentStatusSubmitted PaymentStatus = "Submitted"
	PaymentStatusVerified  PaymentStatus = "Verified"
	PaymentStatusRejected  PaymentStatus = "Rejected"
)

type PaymentQuote struct {
	NativeAmountDisplay   string    `json:"nativeAmountDisplay" bson:"native_amount_display"`
	NativeAmountBaseUnits string    `json:"nativeAmountBaseUnits" bson:"native_amount_base_units"`
	NativeSymbol          string    `json:"nativeSymbol" bson:"native_symbol"`
	USDPerNative          float64   `json:"usdPerNative" bson:"usd_per_native"`
	SourceLabel           string    `json:"sourceLabel" bson:"source_label"`
	FetchedAt             time.Time `json:"fetchedAt" bson:"fetched_at"`
}

type Payment struct {
	ID                    string        `json:"id" bson:"_id"`
	GroupID               string        `json:"groupId" bson:"group_id"`
	CycleID               string        `json:"cycleId" bson:"cycle_id"`
	PayerWallet           string        `json:"payerWallet" bson:"payer_wallet"`
	PayeeWallet           string        `json:"payeeWallet" bson:"payee_wallet"`
	USDObligationAmount   float64       `json:"usdObligationAmount" bson:"usd_obligation_amount"`
	USDObligationCents    int64         `json:"-" bson:"usd_obligation_cents"`
	TxHash                string        `json:"txHash" bson:"tx_hash"`
	ChainNetwork          string        `json:"chainNetwork" bson:"chain_network"`
	ChainID               int64         `json:"chainId" bson:"chain_id"`
	NativeAmountBaseUnits string        `json:"nativeAmountBaseUnits" bson:"native_amount_base_units"`
	Quote                 *PaymentQuote `json:"quote,omitempty" bson:"quote,omitempty"`
	Status                PaymentStatus `json:"status" bson:"status"`
	VerificationMessage   string        `json:"verificationMessage,omitempty" bson:"verification_message,omitempty"`
	SubmittedAt           time.Time     `json:"submittedAt" bson:"submitted_at"`
	VerifiedAt            *time.Time    `json:"verifiedAt,omitempty" bson:"verified_at,omitempty"`
	CreatedAt             time.Time     `json:"createdAt" bson:"created_at"`
	UpdatedAt             time.Time     `json:"updatedAt" bson:"updated_at"`
}

type SubmitPaymentRequest struct {
	PayerWallet           string        `json:"payerWallet"`
	PayeeWallet           string        `json:"payeeWallet"`
	USDObligationAmount   float64       `json:"usdObligationAmount"`
	TxHash                string        `json:"txHash"`
	ChainNetwork          string        `json:"chainNetwork"`
	ChainID               int64         `json:"chainId"`
	NativeAmountBaseUnits string        `json:"nativeAmountBaseUnits"`
	Quote                 *PaymentQuote `json:"quote"`
}

type PaymentResponse struct {
	Payment Payment `json:"payment"`
}

type PaymentsResponse struct {
	Payments []Payment `json:"payments"`
}

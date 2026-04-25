package settlementplan

type MemberBalance struct {
	WalletAddress string  `json:"walletAddress"`
	DisplayName   string  `json:"displayName"`
	TotalPaid     float64 `json:"totalPaid"`
	TotalOwed     float64 `json:"totalOwed"`
	Balance       float64 `json:"balance"`
}

type Settlement struct {
	ID                string  `json:"id"`
	FromWalletAddress string  `json:"fromWalletAddress"`
	FromDisplayName   string  `json:"fromDisplayName"`
	ToWalletAddress   string  `json:"toWalletAddress"`
	ToDisplayName     string  `json:"toDisplayName"`
	Amount            float64 `json:"amount"`
	Status            string  `json:"status"`
}

type PaymentQuote struct {
	NativeAmountDisplay   string  `json:"nativeAmountDisplay"`
	NativeAmountBaseUnits string  `json:"nativeAmountBaseUnits"`
	NativeSymbol          string  `json:"nativeSymbol"`
	USDPerNative          float64 `json:"usdPerNative"`
	SourceLabel           string  `json:"sourceLabel"`
	FetchedAt             string  `json:"fetchedAt"`
}

type PaymentRecord struct {
	ID                    string        `json:"id"`
	CycleID               string        `json:"cycleId"`
	PayerWallet           string        `json:"payerWallet"`
	PayeeWallet           string        `json:"payeeWallet"`
	USDObligationAmount   float64       `json:"usdObligationAmount"`
	TxHash                string        `json:"txHash"`
	ChainNetwork          string        `json:"chainNetwork"`
	ChainID               int64         `json:"chainId"`
	NativeAmountBaseUnits string        `json:"nativeAmountBaseUnits"`
	Quote                 *PaymentQuote `json:"quote,omitempty"`
	Status                string        `json:"status"`
	VerificationMessage   string        `json:"verificationMessage,omitempty"`
	SubmittedAt           string        `json:"submittedAt"`
	VerifiedAt            string        `json:"verifiedAt,omitempty"`
}

type Summary struct {
	Members       []MemberBalance `json:"members"`
	Settlements   []Settlement    `json:"settlements"`
	Payments      []PaymentRecord `json:"payments"`
	TotalExpenses float64         `json:"totalExpenses"`
	ExpenseCount  int             `json:"expenseCount"`
}

type SummaryResponse struct {
	Summary Summary `json:"summary"`
}

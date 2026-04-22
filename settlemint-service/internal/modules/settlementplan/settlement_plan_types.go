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

type Summary struct {
	Members       []MemberBalance `json:"members"`
	Settlements   []Settlement    `json:"settlements"`
	TotalExpenses float64         `json:"totalExpenses"`
	ExpenseCount  int             `json:"expenseCount"`
}

type SummaryResponse struct {
	Summary Summary `json:"summary"`
}

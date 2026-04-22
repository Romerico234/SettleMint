package expenses

import "time"

type ExpenseSplit struct {
	WalletAddress string  `json:"walletAddress"`
	DisplayName   string  `json:"displayName"`
	Amount        float64 `json:"amount"`
}

type Expense struct {
	ID                string         `json:"id"`
	GroupID           string         `json:"groupId"`
	CycleID           string         `json:"cycleId"`
	Description       string         `json:"description"`
	Amount            float64        `json:"amount"`
	PaidByWallet      string         `json:"paidByWallet"`
	PaidByDisplayName string         `json:"paidByDisplayName"`
	CreatedByWallet   string         `json:"createdByWallet"`
	CreatedAt         time.Time      `json:"createdAt"`
	UpdatedAt         time.Time      `json:"updatedAt"`
	Splits            []ExpenseSplit `json:"splits"`
	DeleteApprovalCount         int   `json:"deleteApprovalCount"`
	DeleteRequiredApprovalCount int   `json:"deleteRequiredApprovalCount"`
	DeleteApprovedByCurrentUser bool  `json:"deleteApprovedByCurrentUser"`
	DeletePending               bool  `json:"deletePending"`
}

type CreateExpenseSplitRequest struct {
	WalletAddress string  `json:"walletAddress"`
	Amount        float64 `json:"amount"`
}

type CreateExpenseRequest struct {
	Description  string                      `json:"description"`
	Amount       float64                     `json:"amount"`
	PaidByWallet string                      `json:"paidByWallet"`
	Splits       []CreateExpenseSplitRequest `json:"splits"`
}

type ExpenseResponse struct {
	Expense Expense `json:"expense"`
}

type ExpensesResponse struct {
	Expenses []Expense `json:"expenses"`
}

type ExpenseDeleteApprovalResponse struct {
	Status                string `json:"status"`
	ExpenseID             string `json:"expenseId"`
	ApprovalCount         int    `json:"approvalCount"`
	RequiredApprovalCount int    `json:"requiredApprovalCount"`
}

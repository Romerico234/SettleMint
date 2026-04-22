package expenses

import (
	"context"
	"errors"
	"strings"

	"settlemint-service/internal/modules/auth"
)

var (
	ErrGroupMembershipRequired     = errors.New("you are not a member of this group")
	ErrCycleNotFound               = errors.New("settlement cycle not found")
	ErrExpenseNotFound             = errors.New("expense not found")
	ErrCycleArchived               = errors.New("cannot add expenses to an archived settlement cycle")
	ErrExpensePaidByMustBeMember   = errors.New("expense payer must be a member of this group")
	ErrExpenseSplitRequired        = errors.New("at least one expense split is required")
	ErrExpenseSplitTotalMismatch   = errors.New("expense split total must match the expense amount")
	ErrExpenseSplitMemberRequired  = errors.New("all expense split members must belong to this group")
	ErrExpenseDuplicateSplitMember = errors.New("each split member can only appear once per expense")
	ErrExpenseDeleteAlreadyApproved = errors.New("you have already approved deleting this expense")
	ErrInvalidAmount               = errors.New("amount must be greater than 0")
	ErrInvalidAmountPrecision      = errors.New("amount must use at most two decimal places")
)

type Service struct {
	store *Store
}

func NewService(store *Store) *Service {
	return &Service{store: store}
}

func (s *Service) CreateExpense(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
	input CreateExpenseRequest,
) (Expense, error) {
	input.Description = strings.TrimSpace(input.Description)
	input.PaidByWallet = strings.TrimSpace(input.PaidByWallet)

	for index := range input.Splits {
		input.Splits[index].WalletAddress = strings.TrimSpace(input.Splits[index].WalletAddress)
	}

	return s.store.CreateExpense(ctx, authUser, strings.TrimSpace(groupID), strings.TrimSpace(cycleID), input)
}

func (s *Service) ListExpenses(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
) ([]Expense, error) {
	return s.store.ListExpenses(ctx, authUser, strings.TrimSpace(groupID), strings.TrimSpace(cycleID))
}

func (s *Service) ApproveExpenseDelete(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
	expenseID string,
) (ExpenseDeleteApprovalResponse, error) {
	return s.store.ApproveExpenseDelete(
		ctx,
		authUser,
		strings.TrimSpace(groupID),
		strings.TrimSpace(cycleID),
		strings.TrimSpace(expenseID),
	)
}

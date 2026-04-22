package expenses

import (
	"errors"
	"net/http"
	"strings"

	"settlemint-service/internal/core/server"
	"settlemint-service/internal/modules/auth"

	"github.com/go-chi/chi/v5"
)

type Module struct {
	middleware func(http.Handler) http.Handler
	service    *Service
}

func NewModule(store *Store, verifier auth.TokenVerifier) Module {
	return Module{
		middleware: auth.Middleware(verifier),
		service:    NewService(store),
	}
}

func (m Module) RegisterRoutes(r chi.Router) {
	r.Route("/groups/{groupID}/cycles/{cycleID}/expenses", func(r chi.Router) {
		r.Use(m.middleware)
		r.Get("/", m.ListExpenses)
		r.Post("/", m.CreateExpense)
		r.Post("/{expenseID}/delete-approvals", m.ApproveExpenseDelete)
	})
}

func (m Module) ListExpenses(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "Missing authenticated user")
		return
	}

	groupID := strings.TrimSpace(chi.URLParam(r, "groupID"))
	cycleID := strings.TrimSpace(chi.URLParam(r, "cycleID"))
	if groupID == "" || cycleID == "" {
		server.WriteError(w, http.StatusBadRequest, "Group ID and Settlement Cycle ID are required")
		return
	}

	expenses, err := m.service.ListExpenses(r.Context(), authUser, groupID, cycleID)
	if err != nil {
		switch {
		case errors.Is(err, ErrGroupMembershipRequired), errors.Is(err, ErrCycleNotFound):
			server.WriteError(w, http.StatusNotFound, capitalizeError(err.Error()))
			return
		}
		server.WriteError(w, http.StatusInternalServerError, capitalizeError(err.Error()))
		return
	}

	server.WriteJSON(w, http.StatusOK, ExpensesResponse{Expenses: expenses})
}

func (m Module) CreateExpense(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "Missing authenticated user")
		return
	}

	groupID := strings.TrimSpace(chi.URLParam(r, "groupID"))
	cycleID := strings.TrimSpace(chi.URLParam(r, "cycleID"))
	if groupID == "" || cycleID == "" {
		server.WriteError(w, http.StatusBadRequest, "Group ID and Settlement Cycle ID are required")
		return
	}

	var input CreateExpenseRequest
	if err := server.DecodeJSON(r, &input); err != nil {
		server.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := validateCreateExpenseInput(input); err != nil {
		server.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	expense, err := m.service.CreateExpense(r.Context(), authUser, groupID, cycleID, input)
	if err != nil {
		switch {
		case errors.Is(err, ErrGroupMembershipRequired), errors.Is(err, ErrCycleNotFound):
			server.WriteError(w, http.StatusNotFound, capitalizeError(err.Error()))
			return
		case errors.Is(err, ErrCycleArchived):
			server.WriteError(w, http.StatusConflict, capitalizeError(err.Error()))
			return
		case errors.Is(err, ErrExpensePaidByMustBeMember),
			errors.Is(err, ErrExpenseSplitRequired),
			errors.Is(err, ErrExpenseSplitTotalMismatch),
			errors.Is(err, ErrExpenseSplitMemberRequired),
			errors.Is(err, ErrExpenseDuplicateSplitMember),
			errors.Is(err, ErrInvalidAmount),
			errors.Is(err, ErrInvalidAmountPrecision):
			server.WriteError(w, http.StatusBadRequest, capitalizeError(err.Error()))
			return
		}
		server.WriteError(w, http.StatusInternalServerError, capitalizeError(err.Error()))
		return
	}

	server.WriteJSON(w, http.StatusCreated, ExpenseResponse{Expense: expense})
}

func (m Module) ApproveExpenseDelete(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "Missing authenticated user")
		return
	}

	groupID := strings.TrimSpace(chi.URLParam(r, "groupID"))
	cycleID := strings.TrimSpace(chi.URLParam(r, "cycleID"))
	expenseID := strings.TrimSpace(chi.URLParam(r, "expenseID"))
	if groupID == "" || cycleID == "" || expenseID == "" {
		server.WriteError(w, http.StatusBadRequest, "Group ID, Settlement Cycle ID, and Expense ID are required")
		return
	}

	response, err := m.service.ApproveExpenseDelete(r.Context(), authUser, groupID, cycleID, expenseID)
	if err != nil {
		switch {
		case errors.Is(err, ErrGroupMembershipRequired), errors.Is(err, ErrCycleNotFound), errors.Is(err, ErrExpenseNotFound):
			server.WriteError(w, http.StatusNotFound, capitalizeError(err.Error()))
			return
		case errors.Is(err, ErrExpenseDeleteAlreadyApproved):
			server.WriteError(w, http.StatusConflict, capitalizeError(err.Error()))
			return
		}
		server.WriteError(w, http.StatusInternalServerError, capitalizeError(err.Error()))
		return
	}

	server.WriteJSON(w, http.StatusOK, response)
}

func validateCreateExpenseInput(input CreateExpenseRequest) error {
	if strings.TrimSpace(input.Description) == "" {
		return errors.New("Expense description is required")
	}
	if len(strings.TrimSpace(input.Description)) > 120 {
		return errors.New("Expense description must be 120 characters or fewer")
	}
	if input.Amount <= 0 {
		return errors.New("Expense amount must be greater than 0")
	}
	if strings.TrimSpace(input.PaidByWallet) == "" {
		return errors.New("Paid by wallet is required")
	}
	if len(input.Splits) == 0 {
		return errors.New("At least one split is required")
	}

	return nil
}

func capitalizeError(message string) string {
	if message == "" {
		return message
	}
	return strings.ToUpper(message[:1]) + message[1:]
}

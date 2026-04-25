package settlementpayments

import (
	"errors"
	"net/http"
	"strings"

	"settlemint-service/internal/core/config"
	"settlemint-service/internal/core/server"
	"settlemint-service/internal/modules/auth"
	"settlemint-service/internal/modules/settlement-plan"

	"github.com/go-chi/chi/v5"
)

type Module struct {
	middleware func(http.Handler) http.Handler
	service    *Service
}

func NewModule(store *Store, plan *settlementplan.Service, cfg config.Config, verifier auth.TokenVerifier) Module {
	return Module{
		middleware: auth.Middleware(verifier),
		service:    NewService(store, plan, cfg),
	}
}

func (m Module) RegisterRoutes(r chi.Router) {
	r.Route("/groups/{groupID}/cycles/{cycleID}/settlement-payments", func(r chi.Router) {
		r.Use(m.middleware)
		r.Get("/", m.ListPayments)
		r.Post("/", m.SubmitPayment)
	})
}

func (m Module) SubmitPayment(w http.ResponseWriter, r *http.Request) {
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

	var input SubmitPaymentRequest
	if err := server.DecodeJSON(r, &input); err != nil {
		server.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	payment, err := m.service.SubmitPayment(r.Context(), authUser, groupID, cycleID, input)
	if err != nil {
		switch {
		case errors.Is(err, ErrGroupMembershipRequired), errors.Is(err, ErrCycleNotFound):
			server.WriteError(w, http.StatusNotFound, capitalizeError(err.Error()))
		case errors.Is(err, ErrPayerMustSubmit):
			server.WriteError(w, http.StatusForbidden, capitalizeError(err.Error()))
		case errors.Is(err, ErrInvalidWallet),
			errors.Is(err, ErrInvalidTransactionHash),
			errors.Is(err, ErrInvalidNativeAmount),
			errors.Is(err, ErrInvalidAmount),
			errors.Is(err, ErrInvalidAmountPrecision),
			errors.Is(err, ErrInvalidChain),
			errors.Is(err, ErrObligationNotFound):
			server.WriteError(w, http.StatusBadRequest, capitalizeError(err.Error()))
		default:
			server.WriteError(w, http.StatusInternalServerError, capitalizeError(err.Error()))
		}
		return
	}

	server.WriteJSON(w, http.StatusCreated, PaymentResponse{Payment: payment})
}

func (m Module) ListPayments(w http.ResponseWriter, r *http.Request) {
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

	payments, err := m.service.ListPayments(r.Context(), authUser, groupID, cycleID)
	if err != nil {
		switch {
		case errors.Is(err, ErrGroupMembershipRequired), errors.Is(err, ErrCycleNotFound):
			server.WriteError(w, http.StatusNotFound, capitalizeError(err.Error()))
		default:
			server.WriteError(w, http.StatusInternalServerError, capitalizeError(err.Error()))
		}
		return
	}

	server.WriteJSON(w, http.StatusOK, PaymentsResponse{Payments: payments})
}

func capitalizeError(message string) string {
	if message == "" {
		return message
	}
	return strings.ToUpper(message[:1]) + message[1:]
}

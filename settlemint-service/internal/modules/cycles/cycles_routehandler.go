package cycles

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
	r.Route("/groups/{groupID}/cycles", func(r chi.Router) {
		r.Use(m.middleware)
		r.Get("/", m.ListCycles)
		r.Post("/", m.CreateCycle)
	})
}

func (m Module) ListCycles(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "Missing authenticated user")
		return
	}

	groupID := strings.TrimSpace(chi.URLParam(r, "groupID"))
	if groupID == "" {
		server.WriteError(w, http.StatusBadRequest, "Group ID is required")
		return
	}

	cycles, err := m.service.ListCycles(r.Context(), authUser, groupID)
	if err != nil {
		if errors.Is(err, ErrGroupMembershipRequired) {
			server.WriteError(w, http.StatusNotFound, capitalizeError(err.Error()))
			return
		}
		server.WriteError(w, http.StatusInternalServerError, capitalizeError(err.Error()))
		return
	}

	server.WriteJSON(w, http.StatusOK, CyclesResponse{Cycles: cycles})
}

func (m Module) CreateCycle(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "Missing authenticated user")
		return
	}

	groupID := strings.TrimSpace(chi.URLParam(r, "groupID"))
	if groupID == "" {
		server.WriteError(w, http.StatusBadRequest, "Group ID is required")
		return
	}

	var input CreateCycleRequest
	if err := server.DecodeJSON(r, &input); err != nil {
		server.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := validateCreateCycleInput(input); err != nil {
		server.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	cycle, err := m.service.CreateCycle(r.Context(), authUser, groupID, input)
	if err != nil {
		switch {
		case errors.Is(err, ErrGroupNotFound), errors.Is(err, ErrGroupMembershipRequired):
			server.WriteError(w, http.StatusNotFound, capitalizeError(err.Error()))
			return
		case errors.Is(err, ErrOnlyOwnerCanCreateCycle):
			server.WriteError(w, http.StatusForbidden, capitalizeError(err.Error()))
			return
		case errors.Is(err, ErrActiveSettlementCycleExist):
			server.WriteError(w, http.StatusConflict, capitalizeError(err.Error()))
			return
		}
		server.WriteError(w, http.StatusInternalServerError, capitalizeError(err.Error()))
		return
	}

	server.WriteJSON(w, http.StatusCreated, CycleResponse{Cycle: cycle})
}

func validateCreateCycleInput(input CreateCycleRequest) error {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return errors.New("Settlement Cycle name is required")
	}
	if len(name) > 80 {
		return errors.New("Settlement Cycle name must be 80 characters or fewer")
	}
	return nil
}

func capitalizeError(message string) string {
	if message == "" {
		return message
	}
	return strings.ToUpper(message[:1]) + message[1:]
}

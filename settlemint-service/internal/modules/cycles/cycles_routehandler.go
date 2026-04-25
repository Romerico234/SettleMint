package cycles

import (
	"errors"
	"io"
	"net/http"
	"strings"

	"settlemint-service/internal/core/server"
	"settlemint-service/internal/modules/auth"
	settlementPlan "settlemint-service/internal/modules/settlement-plan"

	"github.com/go-chi/chi/v5"
)

type Module struct {
	middleware func(http.Handler) http.Handler
	service    *Service
}

func NewModule(store *Store, planner *settlementPlan.Service, verifier auth.TokenVerifier) Module {
	return Module{
		middleware: auth.Middleware(verifier),
		service:    NewService(store, planner),
	}
}

func (m Module) RegisterRoutes(r chi.Router) {
	r.Route("/groups/{groupID}/cycles", func(r chi.Router) {
		r.Use(m.middleware)
		r.Get("/", m.ListCycles)
		r.Post("/", m.CreateCycle)
		r.Get("/archives/", m.ListArchives)
		r.Post("/{cycleID}/close/", m.CloseCycle)
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
		}
		server.WriteError(w, http.StatusInternalServerError, capitalizeError(err.Error()))
		return
	}

	server.WriteJSON(w, http.StatusCreated, CycleResponse{Cycle: cycle})
}

func (m Module) ListArchives(w http.ResponseWriter, r *http.Request) {
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

	archives, err := m.service.ListArchives(r.Context(), authUser, groupID)
	if err != nil {
		if errors.Is(err, ErrGroupMembershipRequired) {
			server.WriteError(w, http.StatusNotFound, capitalizeError(err.Error()))
			return
		}
		server.WriteError(w, http.StatusInternalServerError, capitalizeError(err.Error()))
		return
	}

	server.WriteJSON(w, http.StatusOK, ArchivesResponse{Archives: archives})
}

func (m Module) CloseCycle(w http.ResponseWriter, r *http.Request) {
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

	var input CloseCycleRequest
	if r.Body != nil && r.ContentLength != 0 {
		if err := server.DecodeJSON(r, &input); err != nil && !errors.Is(err, io.EOF) {
			server.WriteError(w, http.StatusBadRequest, "Invalid request body")
			return
		}
	}

	archive, err := m.service.CloseCycle(r.Context(), authUser, groupID, cycleID, input)
	if err != nil {
		switch {
		case errors.Is(err, ErrGroupMembershipRequired), errors.Is(err, ErrCycleNotFound):
			server.WriteError(w, http.StatusNotFound, capitalizeError(err.Error()))
			return
		case errors.Is(err, ErrOnlyOwnerCanCloseCycle):
			server.WriteError(w, http.StatusForbidden, capitalizeError(err.Error()))
			return
		case errors.Is(err, ErrCycleAlreadyClosed), errors.Is(err, ErrCycleHasOutstandingItems):
			server.WriteError(w, http.StatusConflict, capitalizeError(err.Error()))
			return
		}
		server.WriteError(w, http.StatusInternalServerError, capitalizeError(err.Error()))
		return
	}

	server.WriteJSON(w, http.StatusOK, ArchiveResponse{Archive: archive})
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

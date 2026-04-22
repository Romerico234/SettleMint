package settlementplan

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
	r.Route("/groups/{groupID}/cycles/{cycleID}/settlement-plan", func(r chi.Router) {
		r.Use(m.middleware)
		r.Get("/", m.GetSummary)
	})
}

func (m Module) GetSummary(w http.ResponseWriter, r *http.Request) {
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

	summary, err := m.service.BuildSummary(r.Context(), authUser, groupID, cycleID)
	if err != nil {
		switch {
		case errors.Is(err, ErrGroupMembershipRequired), errors.Is(err, ErrCycleNotFound):
			server.WriteError(w, http.StatusNotFound, capitalizeError(err.Error()))
			return
		}
		server.WriteError(w, http.StatusInternalServerError, capitalizeError(err.Error()))
		return
	}

	server.WriteJSON(w, http.StatusOK, SummaryResponse{Summary: summary})
}

func capitalizeError(message string) string {
	if message == "" {
		return message
	}
	return strings.ToUpper(message[:1]) + message[1:]
}

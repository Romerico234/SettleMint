package user

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
	service := NewService(store)

	return Module{
		middleware: auth.Middleware(verifier),
		service:    service,
	}
}

func (m Module) RegisterRoutes(r chi.Router) {
	r.Route("/users", func(r chi.Router) {
		r.Use(m.middleware)
		r.Get("/me", m.GetMe)
		r.Put("/me", m.UpdateMe)
	})
}

func (m Module) GetMe(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	profile, err := m.service.EnsureCurrentProfile(r.Context(), authUser)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	server.WriteJSON(w, http.StatusOK, ProfileResponse{Profile: profile})
}

func (m Module) UpdateMe(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	var input UpdateProfileRequest
	if err := server.DecodeJSON(r, &input); err != nil {
		server.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := validateUpdateProfileInput(input); err != nil {
		server.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	profile, err := m.service.UpdateCurrentProfile(r.Context(), authUser, input)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	server.WriteJSON(w, http.StatusOK, ProfileResponse{Profile: profile})
}

func validateUpdateProfileInput(input UpdateProfileRequest) error {
	displayName := strings.TrimSpace(input.DisplayName)

	if len(displayName) > 80 {
		return errors.New("display name must be 80 characters or fewer")
	}

	return nil
}

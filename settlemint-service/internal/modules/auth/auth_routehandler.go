package auth

import (
	"net/http"

	"settlemint-service/internal/core/server"

	"github.com/go-chi/chi/v5"
)

type Module struct {
	authenticator *WalletAuth
	middleware    func(http.Handler) http.Handler
}

func NewModule(authenticator *WalletAuth) Module {
	return Module{
		authenticator: authenticator,
		middleware:    Middleware(authenticator),
	}
}

func (m Module) RegisterRoutes(r chi.Router) {
	r.Route("/auth", func(r chi.Router) {
		r.Post("/challenge", m.CreateChallenge)
		r.Post("/verify", m.VerifyWallet)

		r.Group(func(r chi.Router) {
			r.Use(m.middleware)
			r.Get("/me", m.GetMe)
		})
	})
}

func (m Module) CreateChallenge(w http.ResponseWriter, r *http.Request) {
	var input ChallengeRequest
	if err := server.DecodeJSON(r, &input); err != nil {
		server.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	challenge, err := m.authenticator.CreateChallenge(r.Context(), input)
	if err != nil {
		server.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	server.WriteJSON(w, http.StatusOK, challenge)
}

func (m Module) VerifyWallet(w http.ResponseWriter, r *http.Request) {
	var input VerifyRequest
	if err := server.DecodeJSON(r, &input); err != nil {
		server.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := m.authenticator.VerifyWallet(r.Context(), input)
	if err != nil {
		server.WriteError(w, http.StatusUnauthorized, err.Error())
		return
	}

	server.WriteJSON(w, http.StatusOK, result)
}

func (m Module) GetMe(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	server.WriteJSON(w, http.StatusOK, MeResponse{User: user})
}

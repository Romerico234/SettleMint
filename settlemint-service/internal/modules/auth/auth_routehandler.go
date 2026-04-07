package auth

import (
	"net/http"

	"settlement-service/internal/core/server"

	"github.com/go-chi/chi/v5"
)

type Module struct {
	middleware func(http.Handler) http.Handler
}

func NewModule(verifier TokenVerifier) Module {
	return Module{
		middleware: Middleware(verifier),
	}
}

func (m Module) RegisterRoutes(r chi.Router) {
	r.Route("/auth", func(r chi.Router) {
		r.Use(m.middleware)
		r.Get("/me", m.GetMe)
	})
}

func (m Module) GetMe(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	server.WriteJSON(w, http.StatusOK, MeResponse{User: user})
}

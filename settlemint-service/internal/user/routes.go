package user

import (
	"settlement-service/internal/auth"

	"github.com/go-chi/chi/v5"
)

type Module struct {
	Handler *Handler
}

func (m Module) RegisterRoutes(r chi.Router, authClient *auth.SupabaseAuth) {
	r.Route("/users", func(r chi.Router) {
		r.Use(auth.Middleware(authClient))
		r.Get("/me", m.Handler.GetMe)
		r.Put("/me", m.Handler.UpdateMe)
	})
}

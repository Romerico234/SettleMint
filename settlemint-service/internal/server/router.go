package server

import (
	"encoding/json"
	"net/http"

	"settlement-service/internal/app"
	"settlement-service/internal/auth"

	"github.com/go-chi/chi/v5"
)

func NewRouter(application *app.App) http.Handler {
	r := chi.NewRouter()

	r.Use(corsMiddleware(application.Config.CORSAllowedOrigin))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Route("/auth", func(r chi.Router) {
		r.Use(auth.Middleware(application.AuthClient))
		r.Get("/me", func(w http.ResponseWriter, r *http.Request) {
			user, ok := auth.UserFromContext(r.Context())
			if !ok {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"user": user,
			})
		})
	})

	application.UserModule.RegisterRoutes(r, application.AuthClient)

	return r
}

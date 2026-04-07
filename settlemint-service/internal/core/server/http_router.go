package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

type RouteModule interface {
	RegisterRoutes(r chi.Router)
}

func NewRouter(allowedOrigin string, modules []RouteModule) http.Handler {
	r := chi.NewRouter()

	r.Use(corsMiddleware(allowedOrigin))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]string{
			"status": "ok",
		})
	})

	for _, module := range modules {
		module.RegisterRoutes(r)
	}

	return r
}

package main

import (
	"context"
	"log"
	"net/http"

	"settlemint-service/internal/app"
	"settlemint-service/internal/core/config"
	"settlemint-service/internal/core/server"
)

func main() {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("invalid configuration: %v", err)
	}

	application, err := app.New(context.Background(), cfg)
	if err != nil {
		log.Fatalf("failed to bootstrap application: %v", err)
	}
	defer application.Close()

	router := server.NewRouter(application.Config.CORSAllowedOrigin, application.Modules)

	log.Printf("server running on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

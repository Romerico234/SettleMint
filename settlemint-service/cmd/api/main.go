package main

import (
	"context"
	"log"
	"net/http"

	"settlement-service/internal/app"
	"settlement-service/internal/config"
	"settlement-service/internal/server"
)

func main() {
	cfg := config.Load()

	application, err := app.New(context.Background(), cfg)
	if err != nil {
		log.Fatalf("failed to bootstrap application: %v", err)
	}
	defer application.Close()

	router := server.NewRouter(application)

	log.Printf("server running on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

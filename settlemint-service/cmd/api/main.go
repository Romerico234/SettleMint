package main

import (
	"log"
	"net/http"

	"settlement-service/internal/config"
	"settlement-service/internal/db"
	"settlement-service/internal/server"
)

func main() {
	cfg := config.Load()

	pool, err := db.NewPostgresPool(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	router := server.NewRouter(pool, cfg)

	log.Printf("server running on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, router); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

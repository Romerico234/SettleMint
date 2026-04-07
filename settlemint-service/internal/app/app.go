package app

import (
	"context"
	"fmt"

	"settlement-service/internal/auth"
	"settlement-service/internal/config"
	"settlement-service/internal/db"
	"settlement-service/internal/user"

	"github.com/jackc/pgx/v5/pgxpool"
)

type App struct {
	Config     config.Config
	DB         *pgxpool.Pool
	AuthClient *auth.SupabaseAuth
	UserModule user.Module
}

func New(ctx context.Context, cfg config.Config) (*App, error) {
	pool, err := db.NewPostgresPool(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}

	if err := db.EnsureSchema(ctx, pool); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ensure schema: %w", err)
	}

	userStore := user.NewStore(pool)
	userService := user.NewService(userStore)
	userHandler := user.NewHandler(userService)

	return &App{
		Config:     cfg,
		DB:         pool,
		AuthClient: auth.NewSupabaseAuth(cfg),
		UserModule: user.Module{Handler: userHandler},
	}, nil
}

func (a *App) Close() {
	if a.DB != nil {
		a.DB.Close()
	}
}

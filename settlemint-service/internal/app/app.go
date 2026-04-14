package app

import (
	"context"
	"fmt"

	"settlemint-service/internal/core/config"
	"settlemint-service/internal/core/db"
	"settlemint-service/internal/core/server"
	"settlemint-service/internal/modules/auth"

	"github.com/jackc/pgx/v5/pgxpool"
)

type App struct {
	Config       config.Config
	DB           *pgxpool.Pool
	AuthVerifier auth.TokenVerifier
	Modules      []server.RouteModule
}

func New(ctx context.Context, cfg config.Config) (*App, error) {
	pool, err := db.NewPostgresPool(cfg)
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}

	if err := db.EnsureSchema(ctx, pool); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ensure schema: %w", err)
	}

	factory := NewFactory(cfg, pool)
	authVerifier, modules := factory.BuildModules()

	return &App{
		Config:       cfg,
		DB:           pool,
		AuthVerifier: authVerifier,
		Modules:      modules,
	}, nil
}

func (a *App) Close() {
	if a.DB != nil {
		a.DB.Close()
	}
}

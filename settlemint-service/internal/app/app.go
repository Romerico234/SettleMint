package app

import (
	"context"
	"fmt"

	"settlemint-service/internal/core/config"
	"settlemint-service/internal/core/db"
	"settlemint-service/internal/core/server"
	"settlemint-service/internal/modules/auth"

	"go.mongodb.org/mongo-driver/v2/mongo"
)

type App struct {
	Config       config.Config
	DB           *mongo.Database
	MongoClient  *mongo.Client
	AuthVerifier auth.TokenVerifier
	Modules      []server.RouteModule
}

func New(ctx context.Context, cfg config.Config) (*App, error) {
	client, database, err := db.NewMongoDB(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}

	factory := NewFactory(cfg, database)
	authVerifier, modules := factory.BuildModules()

	return &App{
		Config:       cfg,
		DB:           database,
		MongoClient:  client,
		AuthVerifier: authVerifier,
		Modules:      modules,
	}, nil
}

func (a *App) Close() {
	if a.MongoClient != nil {
		_ = a.MongoClient.Disconnect(context.Background())
	}
}

package app

import (
	"settlemint-service/internal/core/config"
	"settlemint-service/internal/core/server"
	"settlemint-service/internal/modules/auth"
	"settlemint-service/internal/modules/user"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Factory struct {
	config config.Config
	db     *pgxpool.Pool
}

func NewFactory(cfg config.Config, pool *pgxpool.Pool) Factory {
	return Factory{
		config: cfg,
		db:     pool,
	}
}

func (f Factory) BuildModules() (auth.TokenVerifier, []server.RouteModule) {
	authVerifier := auth.NewSupabaseAuth(f.config)
	userDatastore := user.NewDatastore(f.db)

	return authVerifier, []server.RouteModule{
		auth.NewModule(authVerifier),
		user.NewModule(userDatastore, authVerifier),
	}
}

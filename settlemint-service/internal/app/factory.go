package app

import (
	"settlemint-service/internal/core/config"
	"settlemint-service/internal/core/ipfs"
	"settlemint-service/internal/core/server"
	"settlemint-service/internal/modules/auth"
	"settlemint-service/internal/modules/cycles"
	"settlemint-service/internal/modules/expenses"
	"settlemint-service/internal/modules/groups"
	settlementPayments "settlemint-service/internal/modules/settlement-payments"
	settlementPlan "settlemint-service/internal/modules/settlement-plan"
	"settlemint-service/internal/modules/user"

	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Factory struct {
	config config.Config
	db     *mongo.Database
}

func NewFactory(cfg config.Config, database *mongo.Database) Factory {
	return Factory{
		config: cfg,
		db:     database,
	}
}

func (f Factory) BuildModules() (auth.TokenVerifier, []server.RouteModule) {
	authVerifier := auth.NewWalletAuth(f.config, f.db)
	userDatastore := user.NewDatastore(f.db)
	groupDatastore := groups.NewDatastore(f.db)
	cycleDatastore := cycles.NewDatastore(f.db)
	expenseDatastore := expenses.NewDatastore(f.db)
	settlementPlanDatastore := settlementPlan.NewDatastore(f.db)
	settlementPlanService := settlementPlan.NewService(settlementPlanDatastore)
	settlementPaymentDatastore := settlementPayments.NewDatastore(f.db)
	ipfsClient := ipfs.NewClient(f.config)

	return authVerifier, []server.RouteModule{
		auth.NewModule(authVerifier),
		cycles.NewModule(cycleDatastore, settlementPlanService, ipfsClient, authVerifier),
		expenses.NewModule(expenseDatastore, authVerifier),
		groups.NewModule(groupDatastore, authVerifier),
		settlementPayments.NewModule(
			settlementPaymentDatastore,
			settlementPlanService,
			f.config,
			authVerifier,
		),
		settlementPlan.NewModule(settlementPlanDatastore, authVerifier),
		user.NewModule(userDatastore, authVerifier),
	}
}

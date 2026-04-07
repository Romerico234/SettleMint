package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type schemaStep struct {
	name  string
	query string
}

var schemaSteps = []schemaStep{
	{
		name:  "user_profiles table",
		query: ensureUserProfilesTable,
	},
}

const ensureUserProfilesTable = `
	CREATE TABLE IF NOT EXISTS user_profiles (
		id UUID PRIMARY KEY,
		display_name TEXT,
		wallet_address TEXT,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	ALTER TABLE user_profiles
	DROP COLUMN IF EXISTS email;

	CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_wallet_address_unique_idx
	ON user_profiles (wallet_address)
	WHERE wallet_address IS NOT NULL;
`

func EnsureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	for _, step := range schemaSteps {
		if _, err := pool.Exec(ctx, step.query); err != nil {
			return fmt.Errorf("ensure %s: %w", step.name, err)
		}
	}

	return nil
}

package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func EnsureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	const createUserProfilesTable = `
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

	if _, err := pool.Exec(ctx, createUserProfilesTable); err != nil {
		return fmt.Errorf("ensure user_profiles table: %w", err)
	}

	return nil
}

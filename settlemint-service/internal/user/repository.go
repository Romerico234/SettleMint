package user

import (
	"context"
	"fmt"
	"strings"
	"time"

	"settlement-service/internal/auth"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) EnsureProfile(ctx context.Context, user auth.User) (Profile, error) {
	const query = `
		INSERT INTO user_profiles (id, wallet_address)
		VALUES ($1, NULLIF($2, ''))
		ON CONFLICT (id) DO UPDATE
		SET wallet_address = COALESCE(EXCLUDED.wallet_address, user_profiles.wallet_address),
		    updated_at = NOW()
		RETURNING id, COALESCE(display_name, ''), COALESCE(wallet_address, ''), created_at, updated_at;
	`

	return scanProfile(s.pool.QueryRow(ctx, query, user.ID, user.WalletAddress))
}

func (s *Store) UpsertProfile(ctx context.Context, authUser auth.User, input UpdateProfileRequest) (Profile, error) {
	const query = `
		INSERT INTO user_profiles (id, display_name, wallet_address)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''))
		ON CONFLICT (id) DO UPDATE
		SET display_name = EXCLUDED.display_name,
		    wallet_address = COALESCE(EXCLUDED.wallet_address, user_profiles.wallet_address),
		    updated_at = NOW()
		RETURNING id, COALESCE(display_name, ''), COALESCE(wallet_address, ''), created_at, updated_at;
	`

	return scanProfile(s.pool.QueryRow(
		ctx,
		query,
		authUser.ID,
		strings.TrimSpace(input.DisplayName),
		authUser.WalletAddress,
	))
}

func scanProfile(row pgx.Row) (Profile, error) {
	var (
		profile       Profile
		displayName   string
		walletAddress string
		createdAt     time.Time
		updatedAt     time.Time
	)

	if err := row.Scan(
		&profile.ID,
		&displayName,
		&walletAddress,
		&createdAt,
		&updatedAt,
	); err != nil {
		return Profile{}, fmt.Errorf("scan profile: %w", err)
	}

	profile.DisplayName = displayName
	profile.WalletAddress = walletAddress
	profile.CreatedAt = createdAt
	profile.UpdatedAt = updatedAt

	return profile, nil
}

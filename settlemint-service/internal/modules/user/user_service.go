package user

import (
	"context"

	"settlement-service/internal/modules/auth"
)

type Service struct {
	store *Store
}

func NewService(store *Store) *Service {
	return &Service{store: store}
}

func (s *Service) EnsureCurrentProfile(ctx context.Context, authUser auth.User) (Profile, error) {
	return s.store.EnsureProfile(ctx, authUser)
}

func (s *Service) UpdateCurrentProfile(ctx context.Context, authUser auth.User, input UpdateProfileRequest) (Profile, error) {
	return s.store.UpsertProfile(ctx, authUser, input)
}

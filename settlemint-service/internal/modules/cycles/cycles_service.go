package cycles

import (
	"context"
	"errors"
	"strings"

	"settlemint-service/internal/modules/auth"
)

var (
	ErrGroupNotFound              = errors.New("group not found")
	ErrGroupMembershipRequired    = errors.New("you are not a member of this group")
	ErrOnlyOwnerCanCreateCycle    = errors.New("only the group owner can create a settlement cycle")
	ErrActiveSettlementCycleExist = errors.New("group already has an active settlement cycle")
)

type Service struct {
	store *Store
}

func NewService(store *Store) *Service {
	return &Service{store: store}
}

func (s *Service) CreateCycle(ctx context.Context, authUser auth.User, groupID string, input CreateCycleRequest) (Cycle, error) {
	input.Name = strings.TrimSpace(input.Name)
	return s.store.CreateCycle(ctx, authUser, strings.TrimSpace(groupID), input)
}

func (s *Service) ListCycles(ctx context.Context, authUser auth.User, groupID string) ([]Cycle, error) {
	return s.store.ListCyclesByGroup(ctx, authUser, strings.TrimSpace(groupID))
}

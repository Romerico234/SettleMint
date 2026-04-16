package groups

import (
	"context"
	"errors"
	"strings"

	"settlemint-service/internal/modules/auth"
)

const MaxGroupsPerWallet = 10

var (
	ErrGroupInviteNotFound     = errors.New("group invite code was not found")
	ErrGroupMembershipLimit    = errors.New("group membership limit reached")
	ErrGroupNotFound           = errors.New("group not found")
	ErrGroupMembershipRequired = errors.New("you are not a member of this group")
	ErrOwnerCannotLeaveGroup   = errors.New("owners cannot leave a group")
	ErrOnlyOwnerCanDeleteGroup = errors.New("only the group owner can delete this group")
	ErrGroupHasOtherMembers    = errors.New("group owner can only delete a group when no other members remain")
)

type Service struct {
	store *Store
}

func NewService(store *Store) *Service {
	return &Service{store: store}
}

func (s *Service) CreateGroup(ctx context.Context, authUser auth.User, input CreateGroupRequest) (Group, error) {
	input.Name = strings.TrimSpace(input.Name)
	return s.store.CreateGroup(ctx, authUser, input)
}

func (s *Service) JoinGroup(ctx context.Context, authUser auth.User, input JoinGroupRequest) (Group, error) {
	input.InviteCode = strings.TrimSpace(input.InviteCode)
	return s.store.JoinGroupByInviteCode(ctx, authUser, input.InviteCode)
}

func (s *Service) ListMyGroups(ctx context.Context, authUser auth.User) ([]Group, error) {
	return s.store.ListGroupsByWallet(ctx, authUser.WalletAddress)
}

func (s *Service) ListGroupMembers(ctx context.Context, authUser auth.User, groupID string) ([]GroupMember, error) {
	return s.store.ListGroupMembers(ctx, authUser, strings.TrimSpace(groupID))
}

func (s *Service) LeaveGroup(ctx context.Context, authUser auth.User, groupID string) error {
	return s.store.LeaveGroup(ctx, authUser, strings.TrimSpace(groupID))
}

func (s *Service) DeleteGroup(ctx context.Context, authUser auth.User, groupID string) error {
	return s.store.DeleteGroup(ctx, authUser, strings.TrimSpace(groupID))
}

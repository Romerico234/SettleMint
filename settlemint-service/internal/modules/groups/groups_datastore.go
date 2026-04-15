package groups

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"settlemint-service/internal/modules/auth"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Store struct {
	groupsCollection      *mongo.Collection
	membershipsCollection *mongo.Collection
	profilesCollection    *mongo.Collection
}

func NewDatastore(database *mongo.Database) *Store {
	return &Store{
		groupsCollection:      database.Collection("groups"),
		membershipsCollection: database.Collection("group_memberships"),
		profilesCollection:    database.Collection("user_profiles"),
	}
}

func (s *Store) CreateGroup(ctx context.Context, authUser auth.User, input CreateGroupRequest) (Group, error) {
	ownerWallet := normalizeWalletAddress(authUser.WalletAddress)
	if ownerWallet == "" {
		return Group{}, errors.New("authenticated wallet address is invalid")
	}
	if err := s.ensureGroupLimit(ctx, ownerWallet); err != nil {
		return Group{}, err
	}

	now := time.Now().UTC()
	group := Group{
		ID:              prefixedID("grp"),
		Name:            strings.TrimSpace(input.Name),
		OwnerWallet:     ownerWallet,
		InviteCode:      prefixedID("inv"),
		MemberCount:     1,
		CurrentUserRole: "owner",
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	membership := Membership{
		GroupID:       group.ID,
		WalletAddress: ownerWallet,
		Role:          "owner",
		CreatedAt:     now,
	}

	if _, err := s.groupsCollection.InsertOne(ctx, bson.M{
		"_id":          group.ID,
		"name":         group.Name,
		"owner_wallet": group.OwnerWallet,
		"invite_code":  group.InviteCode,
		"member_count": group.MemberCount,
		"created_at":   group.CreatedAt,
		"updated_at":   group.UpdatedAt,
	}); err != nil {
		return Group{}, fmt.Errorf("insert group: %w", err)
	}

	if _, err := s.membershipsCollection.InsertOne(ctx, bson.M{
		"group_id":       membership.GroupID,
		"wallet_address": membership.WalletAddress,
		"role":           membership.Role,
		"created_at":     membership.CreatedAt,
	}); err != nil {
		if _, rollbackErr := s.groupsCollection.DeleteOne(ctx, bson.M{"_id": group.ID}); rollbackErr != nil {
			return Group{}, fmt.Errorf("insert group membership: %w (rollback group: %v)", err, rollbackErr)
		}
		return Group{}, fmt.Errorf("insert group membership: %w", err)
	}

	return group, nil
}

func (s *Store) ListGroupsByWallet(ctx context.Context, walletAddress string) ([]Group, error) {
	normalizedWalletAddress := normalizeWalletAddress(walletAddress)
	if normalizedWalletAddress == "" {
		return []Group{}, nil
	}

	cursor, err := s.membershipsCollection.Find(ctx, bson.M{"wallet_address": normalizedWalletAddress})
	if err != nil {
		return nil, fmt.Errorf("find memberships: %w", err)
	}
	defer cursor.Close(ctx)

	groupIDs := make([]string, 0)
	roleByGroupID := make(map[string]string)
	for cursor.Next(ctx) {
		var membership Membership
		if err := cursor.Decode(&membership); err != nil {
			return nil, fmt.Errorf("decode membership: %w", err)
		}
		groupIDs = append(groupIDs, membership.GroupID)
		roleByGroupID[membership.GroupID] = membership.Role
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate memberships: %w", err)
	}
	if len(groupIDs) == 0 {
		return []Group{}, nil
	}

	memberCountsByGroupID, err := s.loadMemberCountsByGroupID(ctx, groupIDs)
	if err != nil {
		return nil, err
	}

	groupCursor, err := s.groupsCollection.Find(
		ctx,
		bson.M{"_id": bson.M{"$in": groupIDs}},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find groups: %w", err)
	}
	defer groupCursor.Close(ctx)

	groups := make([]Group, 0, len(groupIDs))
	for groupCursor.Next(ctx) {
		var document struct {
			ID          string    `bson:"_id"`
			Name        string    `bson:"name"`
			OwnerWallet string    `bson:"owner_wallet"`
			InviteCode  string    `bson:"invite_code"`
			MemberCount int       `bson:"member_count"`
			CreatedAt   time.Time `bson:"created_at"`
			UpdatedAt   time.Time `bson:"updated_at"`
		}
		if err := groupCursor.Decode(&document); err != nil {
			return nil, fmt.Errorf("decode group: %w", err)
		}
		groups = append(groups, Group{
			ID:              document.ID,
			Name:            document.Name,
			OwnerWallet:     document.OwnerWallet,
			InviteCode:      document.InviteCode,
			MemberCount:     memberCountForGroup(document.ID, document.MemberCount, memberCountsByGroupID),
			CurrentUserRole: roleByGroupID[document.ID],
			CreatedAt:       document.CreatedAt,
			UpdatedAt:       document.UpdatedAt,
		})
	}
	if err := groupCursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate groups: %w", err)
	}

	return groups, nil
}

func (s *Store) JoinGroupByInviteCode(ctx context.Context, authUser auth.User, inviteCode string) (Group, error) {
	memberWallet := normalizeWalletAddress(authUser.WalletAddress)
	if memberWallet == "" {
		return Group{}, errors.New("authenticated wallet address is invalid")
	}

	group, err := s.findGroupByInviteCode(ctx, inviteCode)
	if err != nil {
		return Group{}, err
	}

	existingMembershipCount, err := s.membershipsCollection.CountDocuments(ctx, bson.M{
		"group_id":       group.ID,
		"wallet_address": memberWallet,
	})
	if err != nil {
		return Group{}, fmt.Errorf("check group membership: %w", err)
	}
	if existingMembershipCount > 0 {
		group.CurrentUserRole = roleByExistingMembershipCount(group.OwnerWallet, memberWallet)
		return group, nil
	}
	if err := s.ensureGroupLimit(ctx, memberWallet); err != nil {
		return Group{}, err
	}

	if _, err := s.membershipsCollection.InsertOne(ctx, bson.M{
		"group_id":       group.ID,
		"wallet_address": memberWallet,
		"role":           "member",
		"created_at":     time.Now().UTC(),
	}); err != nil {
		return Group{}, fmt.Errorf("insert group membership: %w", err)
	}

	if _, err := s.groupsCollection.UpdateOne(ctx, bson.M{"_id": group.ID}, bson.M{
		"$inc": bson.M{"member_count": 1},
		"$set": bson.M{"updated_at": time.Now().UTC()},
	}); err != nil {
		return Group{}, fmt.Errorf("increment group member count: %w", err)
	}

	group.MemberCount += 1
	group.CurrentUserRole = "member"
	return group, nil
}

func (s *Store) LeaveGroup(ctx context.Context, authUser auth.User, groupID string) error {
	memberWallet := normalizeWalletAddress(authUser.WalletAddress)
	if memberWallet == "" {
		return errors.New("authenticated wallet address is invalid")
	}

	membership, err := s.findMembership(ctx, groupID, memberWallet)
	if err != nil {
		return err
	}
	if membership.Role == "owner" {
		return ErrOwnerCannotLeaveGroup
	}

	if _, err := s.membershipsCollection.DeleteOne(ctx, bson.M{
		"group_id":       groupID,
		"wallet_address": memberWallet,
	}); err != nil {
		return fmt.Errorf("delete group membership: %w", err)
	}

	if _, err := s.groupsCollection.UpdateOne(ctx, bson.M{"_id": groupID}, bson.M{
		"$inc": bson.M{"member_count": -1},
		"$set": bson.M{"updated_at": time.Now().UTC()},
	}); err != nil {
		return fmt.Errorf("decrement group member count: %w", err)
	}

	return nil
}

func (s *Store) ListGroupMembers(ctx context.Context, authUser auth.User, groupID string) ([]GroupMember, error) {
	requesterWallet := normalizeWalletAddress(authUser.WalletAddress)
	if requesterWallet == "" {
		return nil, errors.New("authenticated wallet address is invalid")
	}

	if _, err := s.findMembership(ctx, groupID, requesterWallet); err != nil {
		return nil, err
	}

	cursor, err := s.membershipsCollection.Find(
		ctx,
		bson.M{"group_id": groupID},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find group memberships: %w", err)
	}
	defer cursor.Close(ctx)

	memberships := make([]Membership, 0)
	walletAddresses := make([]string, 0)
	for cursor.Next(ctx) {
		var membership Membership
		if err := cursor.Decode(&membership); err != nil {
			return nil, fmt.Errorf("decode group membership: %w", err)
		}
		memberships = append(memberships, membership)
		walletAddresses = append(walletAddresses, membership.WalletAddress)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate group memberships: %w", err)
	}

	profilesByWallet, err := s.loadProfilesByWallet(ctx, walletAddresses)
	if err != nil {
		return nil, err
	}

	members := make([]GroupMember, 0, len(memberships))
	for _, membership := range memberships {
		member := GroupMember{
			WalletAddress: membership.WalletAddress,
			DisplayName:   "",
			Role:          membership.Role,
		}
		if profile, ok := profilesByWallet[membership.WalletAddress]; ok {
			member.DisplayName = profile.DisplayName
		}
		members = append(members, member)
	}

	return members, nil
}

func (s *Store) DeleteGroup(ctx context.Context, authUser auth.User, groupID string) error {
	ownerWallet := normalizeWalletAddress(authUser.WalletAddress)
	if ownerWallet == "" {
		return errors.New("authenticated wallet address is invalid")
	}

	membership, err := s.findMembership(ctx, groupID, ownerWallet)
	if err != nil {
		return err
	}
	if membership.Role != "owner" {
		return ErrOnlyOwnerCanDeleteGroup
	}

	memberCount, err := s.membershipsCollection.CountDocuments(ctx, bson.M{"group_id": groupID})
	if err != nil {
		return fmt.Errorf("count group members: %w", err)
	}
	if memberCount > 1 {
		return ErrGroupHasOtherMembers
	}

	if _, err := s.membershipsCollection.DeleteMany(ctx, bson.M{"group_id": groupID}); err != nil {
		return fmt.Errorf("delete group memberships: %w", err)
	}
	if _, err := s.groupsCollection.DeleteOne(ctx, bson.M{"_id": groupID}); err != nil {
		return fmt.Errorf("delete group: %w", err)
	}

	return nil
}

func (s *Store) findGroupByInviteCode(ctx context.Context, inviteCode string) (Group, error) {
	var document struct {
		ID          string    `bson:"_id"`
		Name        string    `bson:"name"`
		OwnerWallet string    `bson:"owner_wallet"`
		InviteCode  string    `bson:"invite_code"`
		MemberCount int       `bson:"member_count"`
		CreatedAt   time.Time `bson:"created_at"`
		UpdatedAt   time.Time `bson:"updated_at"`
	}

	if err := s.groupsCollection.FindOne(ctx, bson.M{"invite_code": inviteCode}).Decode(&document); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return Group{}, ErrGroupInviteNotFound
		}
		return Group{}, fmt.Errorf("find group by invite code: %w", err)
	}

	return Group{
		ID:          document.ID,
		Name:        document.Name,
		OwnerWallet: document.OwnerWallet,
		InviteCode:  document.InviteCode,
		MemberCount: document.MemberCount,
		CreatedAt:   document.CreatedAt,
		UpdatedAt:   document.UpdatedAt,
	}, nil
}

func (s *Store) ensureGroupLimit(ctx context.Context, walletAddress string) error {
	membershipCount, err := s.membershipsCollection.CountDocuments(ctx, bson.M{
		"wallet_address": walletAddress,
	})
	if err != nil {
		return fmt.Errorf("count memberships: %w", err)
	}
	if membershipCount >= MaxGroupsPerWallet {
		return ErrGroupMembershipLimit
	}
	return nil
}

func (s *Store) findMembership(ctx context.Context, groupID string, walletAddress string) (Membership, error) {
	var membership Membership
	if err := s.membershipsCollection.FindOne(ctx, bson.M{
		"group_id":       groupID,
		"wallet_address": walletAddress,
	}).Decode(&membership); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return Membership{}, ErrGroupMembershipRequired
		}
		return Membership{}, fmt.Errorf("find membership: %w", err)
	}

	return membership, nil
}

func (s *Store) loadProfilesByWallet(ctx context.Context, walletAddresses []string) (map[string]GroupMember, error) {
	if len(walletAddresses) == 0 {
		return map[string]GroupMember{}, nil
	}

	cursor, err := s.profilesCollection.Find(ctx, bson.M{
		"wallet_address": bson.M{"$in": walletAddresses},
	})
	if err != nil {
		return nil, fmt.Errorf("find user profiles by wallet: %w", err)
	}
	defer cursor.Close(ctx)

	profilesByWallet := make(map[string]GroupMember, len(walletAddresses))
	for cursor.Next(ctx) {
		var document struct {
			DisplayName   string `bson:"display_name"`
			WalletAddress string `bson:"wallet_address"`
		}
		if err := cursor.Decode(&document); err != nil {
			return nil, fmt.Errorf("decode user profile: %w", err)
		}
		profilesByWallet[document.WalletAddress] = GroupMember{
			DisplayName:   document.DisplayName,
			WalletAddress: document.WalletAddress,
		}
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate user profiles: %w", err)
	}

	return profilesByWallet, nil
}

func (s *Store) loadMemberCountsByGroupID(ctx context.Context, groupIDs []string) (map[string]int, error) {
	cursor, err := s.membershipsCollection.Aggregate(ctx, mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{"group_id": bson.M{"$in": groupIDs}}}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":   "$group_id",
			"count": bson.M{"$sum": 1},
		}}},
	})
	if err != nil {
		return nil, fmt.Errorf("aggregate group member counts: %w", err)
	}
	defer cursor.Close(ctx)

	memberCountsByGroupID := make(map[string]int, len(groupIDs))
	for cursor.Next(ctx) {
		var result struct {
			GroupID string `bson:"_id"`
			Count   int    `bson:"count"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, fmt.Errorf("decode group member count: %w", err)
		}
		memberCountsByGroupID[result.GroupID] = result.Count
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate group member counts: %w", err)
	}

	return memberCountsByGroupID, nil
}

func memberCountForGroup(groupID string, persistedCount int, aggregatedCounts map[string]int) int {
	if aggregatedCount, ok := aggregatedCounts[groupID]; ok {
		return aggregatedCount
	}
	if persistedCount > 0 {
		return persistedCount
	}
	return 0
}

func roleByExistingMembershipCount(ownerWallet string, walletAddress string) string {
	if ownerWallet == walletAddress {
		return "owner"
	}
	return "member"
}

func prefixedID(prefix string) string {
	buffer := make([]byte, 8)
	if _, err := rand.Read(buffer); err != nil {
		return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
	}
	return prefix + "_" + hex.EncodeToString(buffer)
}

func normalizeWalletAddress(value string) string {
	normalizedValue := strings.ToLower(strings.TrimSpace(value))
	if strings.HasPrefix(normalizedValue, "0x") && len(normalizedValue) == 42 {
		return normalizedValue
	}
	return ""
}

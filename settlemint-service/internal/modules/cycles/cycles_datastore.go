package cycles

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
	cyclesCollection      *mongo.Collection
	groupsCollection      *mongo.Collection
	membershipsCollection *mongo.Collection
}

func NewDatastore(database *mongo.Database) *Store {
	return &Store{
		cyclesCollection:      database.Collection("cycles"),
		groupsCollection:      database.Collection("groups"),
		membershipsCollection: database.Collection("group_memberships"),
	}
}

func (s *Store) CreateCycle(ctx context.Context, authUser auth.User, groupID string, input CreateCycleRequest) (Cycle, error) {
	memberWallet := normalizeWalletAddress(authUser.WalletAddress)
	if memberWallet == "" {
		return Cycle{}, errors.New("authenticated wallet address is invalid")
	}

	membershipRole, err := s.findMembershipRole(ctx, groupID, memberWallet)
	if err != nil {
		return Cycle{}, err
	}
	if membershipRole != "owner" {
		return Cycle{}, ErrOnlyOwnerCanCreateCycle
	}

	exists, err := s.groupExists(ctx, groupID)
	if err != nil {
		return Cycle{}, err
	}
	if !exists {
		return Cycle{}, ErrGroupNotFound
	}

	activeCycleCount, err := s.cyclesCollection.CountDocuments(ctx, bson.M{
		"group_id": groupID,
		"status":   StatusActive,
	})
	if err != nil {
		return Cycle{}, fmt.Errorf("count active settlement cycles: %w", err)
	}
	if activeCycleCount > 0 {
		return Cycle{}, ErrActiveSettlementCycleExist
	}

	now := time.Now().UTC()
	cycle := Cycle{
		ID:              prefixedID("cyc"),
		GroupID:         groupID,
		Name:            input.Name,
		Status:          StatusActive,
		CreatedByWallet: memberWallet,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if _, err := s.cyclesCollection.InsertOne(ctx, bson.M{
		"_id":               cycle.ID,
		"group_id":          cycle.GroupID,
		"name":              cycle.Name,
		"status":            cycle.Status,
		"created_by_wallet": cycle.CreatedByWallet,
		"created_at":        cycle.CreatedAt,
		"updated_at":        cycle.UpdatedAt,
	}); err != nil {
		return Cycle{}, fmt.Errorf("insert settlement cycle: %w", err)
	}

	return cycle, nil
}

func (s *Store) ListCyclesByGroup(ctx context.Context, authUser auth.User, groupID string) ([]Cycle, error) {
	memberWallet := normalizeWalletAddress(authUser.WalletAddress)
	if memberWallet == "" {
		return nil, errors.New("authenticated wallet address is invalid")
	}

	if _, err := s.findMembershipRole(ctx, groupID, memberWallet); err != nil {
		return nil, err
	}

	cursor, err := s.cyclesCollection.Find(
		ctx,
		bson.M{"group_id": groupID},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find settlement cycles: %w", err)
	}
	defer cursor.Close(ctx)

	cycles := make([]Cycle, 0)
	for cursor.Next(ctx) {
		var cycle Cycle
		if err := cursor.Decode(&cycle); err != nil {
			return nil, fmt.Errorf("decode settlement cycle: %w", err)
		}
		cycles = append(cycles, cycle)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate settlement cycles: %w", err)
	}

	return cycles, nil
}

func (s *Store) groupExists(ctx context.Context, groupID string) (bool, error) {
	count, err := s.groupsCollection.CountDocuments(ctx, bson.M{"_id": groupID})
	if err != nil {
		return false, fmt.Errorf("count groups: %w", err)
	}
	return count > 0, nil
}

func (s *Store) findMembershipRole(ctx context.Context, groupID string, walletAddress string) (string, error) {
	var membership struct {
		Role string `bson:"role"`
	}

	if err := s.membershipsCollection.FindOne(ctx, bson.M{
		"group_id":       groupID,
		"wallet_address": walletAddress,
	}).Decode(&membership); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return "", ErrGroupMembershipRequired
		}
		return "", fmt.Errorf("find group membership: %w", err)
	}

	return membership.Role, nil
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

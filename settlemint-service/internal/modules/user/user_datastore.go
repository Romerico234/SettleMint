package user

import (
	"context"
	"fmt"
	"strings"
	"time"

	"settlemint-service/internal/modules/auth"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Store struct {
	collection *mongo.Collection
}

func NewDatastore(database *mongo.Database) *Store {
	return &Store{
		collection: database.Collection("user_profiles"),
	}
}

func (s *Store) EnsureProfile(ctx context.Context, user auth.User) (Profile, error) {
	now := time.Now().UTC()
	walletAddress := strings.TrimSpace(user.WalletAddress)
	update := bson.M{
		"$setOnInsert": bson.M{
			"_id":          bson.NewObjectID(),
			"display_name": "",
			"created_at":   now,
		},
		"$set": bson.M{
			"updated_at": now,
		},
	}

	if walletAddress != "" {
		update["$set"].(bson.M)["wallet_address"] = walletAddress
	}

	return s.upsertProfile(ctx, walletAddress, update)
}

func (s *Store) UpsertProfile(ctx context.Context, authUser auth.User, input UpdateProfileRequest) (Profile, error) {
	now := time.Now().UTC()
	walletAddress := strings.TrimSpace(authUser.WalletAddress)
	update := bson.M{
		"$setOnInsert": bson.M{
			"_id":        bson.NewObjectID(),
			"created_at": now,
		},
		"$set": bson.M{
			"display_name": strings.TrimSpace(input.DisplayName),
			"updated_at":   now,
		},
	}

	if walletAddress != "" {
		update["$set"].(bson.M)["wallet_address"] = walletAddress
	}

	return s.upsertProfile(ctx, walletAddress, update)
}

func (s *Store) upsertProfile(ctx context.Context, walletAddress string, update bson.M) (Profile, error) {
	var document struct {
		ID            any       `bson:"_id"`
		DisplayName   string    `bson:"display_name"`
		WalletAddress string    `bson:"wallet_address"`
		CreatedAt     time.Time `bson:"created_at"`
		UpdatedAt     time.Time `bson:"updated_at"`
	}

	if err := s.collection.FindOneAndUpdate(
		ctx,
		bson.M{"wallet_address": walletAddress},
		update,
		options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After),
	).Decode(&document); err != nil {
		return Profile{}, fmt.Errorf("upsert profile: %w", err)
	}

	return Profile{
		ID:            profileIDString(document.ID),
		DisplayName:   document.DisplayName,
		WalletAddress: document.WalletAddress,
		CreatedAt:     document.CreatedAt,
		UpdatedAt:     document.UpdatedAt,
	}, nil
}

func profileIDString(value any) string {
	switch typed := value.(type) {
	case bson.ObjectID:
		return typed.Hex()
	case string:
		return typed
	default:
		return fmt.Sprintf("%v", typed)
	}
}

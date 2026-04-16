package db

import (
	"context"
	"fmt"
	"time"

	"settlemint-service/internal/core/config"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func NewMongoDB(ctx context.Context, cfg config.Config) (*mongo.Client, *mongo.Database, error) {
	if cfg.MongoURI == "" {
		return nil, nil, fmt.Errorf("mongodb uri is required")
	}

	if cfg.MongoDatabase == "" {
		return nil, nil, fmt.Errorf("mongodb database is required")
	}

	client, err := mongo.Connect(options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		return nil, nil, fmt.Errorf("connect mongodb: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := client.Ping(pingCtx, nil); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, nil, fmt.Errorf("ping mongodb: %w", err)
	}

	database := client.Database(cfg.MongoDatabase)
	if err := EnsureCollections(ctx, database); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, nil, fmt.Errorf("ensure collections: %w", err)
	}

	return client, database, nil
}

func EnsureCollections(ctx context.Context, database *mongo.Database) error {
	userProfiles := database.Collection("user_profiles")

	_, err := userProfiles.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "wallet_address", Value: 1}},
		Options: options.Index().
			SetName("user_profiles_wallet_address_unique_idx").
			SetUnique(true).
			SetPartialFilterExpression(bson.D{
				{Key: "wallet_address", Value: bson.D{{Key: "$exists", Value: true}}},
			}),
	})
	if err != nil {
		return fmt.Errorf("create user_profiles wallet_address index: %w", err)
	}

	authNonces := database.Collection("auth_nonces")

	_, err = authNonces.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "nonce", Value: 1}},
			Options: options.Index().SetName("auth_nonces_nonce_unique_idx").SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "expires_at", Value: 1}},
			Options: options.Index().SetName("auth_nonces_expires_at_ttl_idx").SetExpireAfterSeconds(0),
		},
	})
	if err != nil {
		return fmt.Errorf("create auth_nonces indexes: %w", err)
	}

	groups := database.Collection("groups")

	_, err = groups.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "owner_wallet", Value: 1}},
			Options: options.Index().SetName("groups_owner_wallet_idx"),
		},
		{
			Keys:    bson.D{{Key: "invite_code", Value: 1}},
			Options: options.Index().SetName("groups_invite_code_unique_idx").SetUnique(true),
		},
	})
	if err != nil {
		return fmt.Errorf("create groups indexes: %w", err)
	}

	groupMemberships := database.Collection("group_memberships")

	_, err = groupMemberships.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "group_id", Value: 1}},
			Options: options.Index().SetName("group_memberships_group_id_idx"),
		},
		{
			Keys: bson.D{
				{Key: "group_id", Value: 1},
				{Key: "wallet_address", Value: 1},
			},
			Options: options.Index().SetName("group_memberships_group_wallet_unique_idx").SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "wallet_address", Value: 1}},
			Options: options.Index().SetName("group_memberships_wallet_address_idx"),
		},
	})
	if err != nil {
		return fmt.Errorf("create group_memberships indexes: %w", err)
	}

	return nil
}

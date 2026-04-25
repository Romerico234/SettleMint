package settlementpayments

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"settlemint-service/internal/modules/auth"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Store struct {
	paymentsCollection    *mongo.Collection
	cyclesCollection      *mongo.Collection
	membershipsCollection *mongo.Collection
}

func NewDatastore(database *mongo.Database) *Store {
	return &Store{
		paymentsCollection:    database.Collection("settlement_payments"),
		cyclesCollection:      database.Collection("cycles"),
		membershipsCollection: database.Collection("group_memberships"),
	}
}

func (s *Store) EnsureCycleAccess(ctx context.Context, authUser auth.User, groupID string, cycleID string) error {
	memberWallet := normalizeWalletAddress(authUser.WalletAddress)
	if memberWallet == "" {
		return errors.New("authenticated wallet address is invalid")
	}

	if _, err := s.findMembershipRole(ctx, groupID, memberWallet); err != nil {
		return err
	}

	count, err := s.cyclesCollection.CountDocuments(ctx, bson.M{
		"_id":      cycleID,
		"group_id": groupID,
	})
	if err != nil {
		return fmt.Errorf("count settlement cycles: %w", err)
	}
	if count == 0 {
		return ErrCycleNotFound
	}

	return nil
}

func (s *Store) InsertPayment(ctx context.Context, payment Payment) (Payment, error) {
	if payment.ID == "" {
		payment.ID = prefixedID("pay")
	}

	if _, err := s.paymentsCollection.InsertOne(ctx, payment); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			existing, findErr := s.FindByTransaction(ctx, payment.ChainNetwork, payment.TxHash)
			if findErr == nil {
				return existing, nil
			}
		}
		return Payment{}, fmt.Errorf("insert settlement payment: %w", err)
	}

	return payment, nil
}

func (s *Store) UpdateVerification(ctx context.Context, payment Payment) (Payment, error) {
	payment.UpdatedAt = time.Now().UTC()
	_, err := s.paymentsCollection.UpdateOne(
		ctx,
		bson.M{"_id": payment.ID},
		bson.M{"$set": bson.M{
			"status":               payment.Status,
			"verification_message": payment.VerificationMessage,
			"verified_at":          payment.VerifiedAt,
			"updated_at":           payment.UpdatedAt,
		}},
	)
	if err != nil {
		return Payment{}, fmt.Errorf("update settlement payment verification: %w", err)
	}

	return payment, nil
}

func (s *Store) ListPayments(ctx context.Context, authUser auth.User, groupID string, cycleID string) ([]Payment, error) {
	if err := s.EnsureCycleAccess(ctx, authUser, groupID, cycleID); err != nil {
		return nil, err
	}

	cursor, err := s.paymentsCollection.Find(
		ctx,
		bson.M{"group_id": groupID, "cycle_id": cycleID},
		options.Find().SetSort(bson.D{{Key: "submitted_at", Value: 1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find settlement payments: %w", err)
	}
	defer cursor.Close(ctx)

	payments := make([]Payment, 0)
	for cursor.Next(ctx) {
		var payment Payment
		if err := cursor.Decode(&payment); err != nil {
			return nil, fmt.Errorf("decode settlement payment: %w", err)
		}
		payments = append(payments, payment)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate settlement payments: %w", err)
	}

	return payments, nil
}

func (s *Store) FindByTransaction(ctx context.Context, chainNetwork string, txHash string) (Payment, error) {
	var payment Payment
	if err := s.paymentsCollection.FindOne(ctx, bson.M{
		"chain_network": chainNetwork,
		"tx_hash":       txHash,
	}).Decode(&payment); err != nil {
		return Payment{}, err
	}

	return payment, nil
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

func currencyToCents(value float64) (int64, error) {
	if value <= 0 || !isFinite(value) {
		return 0, ErrInvalidAmount
	}

	cents := math.Round(value * 100)
	if math.Abs(value*100-cents) > 0.000001 {
		return 0, ErrInvalidAmountPrecision
	}

	return int64(cents), nil
}

func centsToCurrency(value int64) float64 {
	return float64(value) / 100
}

func isFinite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}

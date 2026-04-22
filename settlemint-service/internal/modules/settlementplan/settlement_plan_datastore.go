package settlementplan

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"

	"settlemint-service/internal/modules/auth"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Store struct {
	expensesCollection    *mongo.Collection
	splitsCollection      *mongo.Collection
	cyclesCollection      *mongo.Collection
	membershipsCollection *mongo.Collection
	profilesCollection    *mongo.Collection
}

func NewDatastore(database *mongo.Database) *Store {
	return &Store{
		expensesCollection:    database.Collection("expenses"),
		splitsCollection:      database.Collection("expense_splits"),
		cyclesCollection:      database.Collection("cycles"),
		membershipsCollection: database.Collection("group_memberships"),
		profilesCollection:    database.Collection("user_profiles"),
	}
}

func (s *Store) LoadCycleData(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
) ([]memberSnapshot, []expenseSnapshot, map[string][]splitSnapshot, error) {
	memberWallet := normalizeWalletAddress(authUser.WalletAddress)
	if memberWallet == "" {
		return nil, nil, nil, errors.New("authenticated wallet address is invalid")
	}

	if _, err := s.findMembershipRole(ctx, groupID, memberWallet); err != nil {
		return nil, nil, nil, err
	}
	if err := s.ensureCycleExists(ctx, groupID, cycleID); err != nil {
		return nil, nil, nil, err
	}

	members, err := s.loadGroupMembers(ctx, groupID)
	if err != nil {
		return nil, nil, nil, err
	}

	expenses, err := s.loadCycleExpenses(ctx, groupID, cycleID)
	if err != nil {
		return nil, nil, nil, err
	}
	if len(expenses) == 0 {
		return members, []expenseSnapshot{}, map[string][]splitSnapshot{}, nil
	}

	expenseIDs := make([]string, 0, len(expenses))
	for _, expense := range expenses {
		expenseIDs = append(expenseIDs, expense.ID)
	}

	splitsByExpenseID, err := s.loadSplitsByExpenseID(ctx, expenseIDs)
	if err != nil {
		return nil, nil, nil, err
	}

	return members, expenses, splitsByExpenseID, nil
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

func (s *Store) ensureCycleExists(ctx context.Context, groupID string, cycleID string) error {
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

func (s *Store) loadGroupMembers(ctx context.Context, groupID string) ([]memberSnapshot, error) {
	cursor, err := s.membershipsCollection.Find(
		ctx,
		bson.M{"group_id": groupID},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find group memberships: %w", err)
	}
	defer cursor.Close(ctx)

	walletAddresses := make([]string, 0)
	for cursor.Next(ctx) {
		var membership struct {
			WalletAddress string `bson:"wallet_address"`
		}
		if err := cursor.Decode(&membership); err != nil {
			return nil, fmt.Errorf("decode group membership: %w", err)
		}
		walletAddresses = append(walletAddresses, membership.WalletAddress)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate group memberships: %w", err)
	}

	displayNameByWallet, err := s.loadDisplayNamesByWallet(ctx, walletAddresses)
	if err != nil {
		return nil, err
	}

	members := make([]memberSnapshot, 0, len(walletAddresses))
	for _, walletAddress := range walletAddresses {
		members = append(members, memberSnapshot{
			WalletAddress: walletAddress,
			DisplayName:   displayNameByWallet[walletAddress],
		})
	}

	return members, nil
}

func (s *Store) loadCycleExpenses(ctx context.Context, groupID string, cycleID string) ([]expenseSnapshot, error) {
	cursor, err := s.expensesCollection.Find(
		ctx,
		bson.M{"group_id": groupID, "cycle_id": cycleID},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find expenses: %w", err)
	}
	defer cursor.Close(ctx)

	expenses := make([]expenseSnapshot, 0)
	for cursor.Next(ctx) {
		var document struct {
			ID           string `bson:"_id"`
			PaidByWallet string `bson:"paid_by_wallet"`
			AmountCents  int64  `bson:"amount_cents"`
		}
		if err := cursor.Decode(&document); err != nil {
			return nil, fmt.Errorf("decode expense: %w", err)
		}
		expenses = append(expenses, expenseSnapshot{
			ID:           document.ID,
			PaidByWallet: document.PaidByWallet,
			AmountCents:  document.AmountCents,
		})
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate expenses: %w", err)
	}

	return expenses, nil
}

func (s *Store) loadSplitsByExpenseID(ctx context.Context, expenseIDs []string) (map[string][]splitSnapshot, error) {
	cursor, err := s.splitsCollection.Find(
		ctx,
		bson.M{"expense_id": bson.M{"$in": expenseIDs}},
		options.Find().SetSort(bson.D{{Key: "position", Value: 1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find expense splits: %w", err)
	}
	defer cursor.Close(ctx)

	splitsByExpenseID := make(map[string][]splitSnapshot)
	for cursor.Next(ctx) {
		var document struct {
			ExpenseID     string `bson:"expense_id"`
			WalletAddress string `bson:"wallet_address"`
			AmountCents   int64  `bson:"amount_cents"`
		}
		if err := cursor.Decode(&document); err != nil {
			return nil, fmt.Errorf("decode expense split: %w", err)
		}
		splitsByExpenseID[document.ExpenseID] = append(splitsByExpenseID[document.ExpenseID], splitSnapshot{
			WalletAddress: document.WalletAddress,
			AmountCents:   document.AmountCents,
		})
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate expense splits: %w", err)
	}

	return splitsByExpenseID, nil
}

func (s *Store) loadDisplayNamesByWallet(ctx context.Context, walletAddresses []string) (map[string]string, error) {
	uniqueWalletAddresses := uniqueWallets(walletAddresses)
	if len(uniqueWalletAddresses) == 0 {
		return map[string]string{}, nil
	}

	cursor, err := s.profilesCollection.Find(ctx, bson.M{
		"wallet_address": bson.M{"$in": uniqueWalletAddresses},
	})
	if err != nil {
		return nil, fmt.Errorf("find user profiles: %w", err)
	}
	defer cursor.Close(ctx)

	displayNameByWallet := make(map[string]string, len(uniqueWalletAddresses))
	for cursor.Next(ctx) {
		var document struct {
			WalletAddress string `bson:"wallet_address"`
			DisplayName   string `bson:"display_name"`
		}
		if err := cursor.Decode(&document); err != nil {
			return nil, fmt.Errorf("decode user profile: %w", err)
		}
		displayNameByWallet[document.WalletAddress] = document.DisplayName
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate user profiles: %w", err)
	}

	return displayNameByWallet, nil
}

func centsToCurrency(value int64) float64 {
	return float64(value) / 100
}

func currencyToCents(value float64) int64 {
	return int64(math.Round(value * 100))
}

func uniqueWallets(walletAddresses []string) []string {
	seenWallets := make(map[string]struct{}, len(walletAddresses))
	uniqueWalletAddresses := make([]string, 0, len(walletAddresses))

	for _, walletAddress := range walletAddresses {
		if walletAddress == "" {
			continue
		}
		if _, ok := seenWallets[walletAddress]; ok {
			continue
		}

		seenWallets[walletAddress] = struct{}{}
		uniqueWalletAddresses = append(uniqueWalletAddresses, walletAddress)
	}

	sort.Strings(uniqueWalletAddresses)
	return uniqueWalletAddresses
}

func normalizeWalletAddress(value string) string {
	normalizedValue := strings.ToLower(strings.TrimSpace(value))
	if strings.HasPrefix(normalizedValue, "0x") && len(normalizedValue) == 42 {
		return normalizedValue
	}
	return ""
}

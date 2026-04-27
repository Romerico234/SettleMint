package cycles

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"settlemint-service/internal/modules/auth"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type archiveSeed struct {
	ArchiveID string
	Group     ArchiveGroup
	Members   []ArchiveMember
	Expenses  []ArchiveExpense
	ClosedAt  time.Time
}

type cycleDocument struct {
	ID              string    `bson:"_id"`
	GroupID         string    `bson:"group_id"`
	Name            string    `bson:"name"`
	Status          Status    `bson:"status"`
	CreatedByWallet string    `bson:"created_by_wallet"`
	CreatedAt       time.Time `bson:"created_at"`
	UpdatedAt       time.Time `bson:"updated_at"`
}

type membershipDocument struct {
	GroupID       string    `bson:"group_id"`
	WalletAddress string    `bson:"wallet_address"`
	Role          string    `bson:"role"`
	CreatedAt     time.Time `bson:"created_at"`
}

type groupDocument struct {
	ID          string    `bson:"_id"`
	Name        string    `bson:"name"`
	OwnerWallet string    `bson:"owner_wallet"`
	InviteCode  string    `bson:"invite_code"`
	MemberCount int       `bson:"member_count"`
	CreatedAt   time.Time `bson:"created_at"`
	UpdatedAt   time.Time `bson:"updated_at"`
}

type expenseDocument struct {
	ID              string    `bson:"_id"`
	GroupID         string    `bson:"group_id"`
	CycleID         string    `bson:"cycle_id"`
	Description     string    `bson:"description"`
	AmountCents     int64     `bson:"amount_cents"`
	PaidByWallet    string    `bson:"paid_by_wallet"`
	CreatedByWallet string    `bson:"created_by_wallet"`
	CreatedAt       time.Time `bson:"created_at"`
	UpdatedAt       time.Time `bson:"updated_at"`
}

type splitDocument struct {
	ExpenseID     string `bson:"expense_id"`
	WalletAddress string `bson:"wallet_address"`
	AmountCents   int64  `bson:"amount_cents"`
	Position      int    `bson:"position"`
}

type Store struct {
	cyclesCollection          *mongo.Collection
	cycleArchivesCollection   *mongo.Collection
	groupsCollection          *mongo.Collection
	membershipsCollection     *mongo.Collection
	profilesCollection        *mongo.Collection
	expensesCollection        *mongo.Collection
	splitsCollection          *mongo.Collection
	deleteApprovalsCollection *mongo.Collection
	paymentsCollection        *mongo.Collection
}

func NewDatastore(database *mongo.Database) *Store {
	return &Store{
		cyclesCollection:          database.Collection("cycles"),
		cycleArchivesCollection:   database.Collection("cycle_archives"),
		groupsCollection:          database.Collection("groups"),
		membershipsCollection:     database.Collection("group_memberships"),
		profilesCollection:        database.Collection("user_profiles"),
		expensesCollection:        database.Collection("expenses"),
		splitsCollection:          database.Collection("expense_splits"),
		deleteApprovalsCollection: database.Collection("expense_delete_approvals"),
		paymentsCollection:        database.Collection("settlement_payments"),
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

	totalCycleCount, err := s.countSettlementCycles(ctx, groupID)
	if err != nil {
		return Cycle{}, err
	}
	if totalCycleCount >= 10 {
		return Cycle{}, ErrSettlementCycleLimitReached
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

func (s *Store) ListArchivesByGroup(ctx context.Context, authUser auth.User, groupID string) ([]ArchiveSummary, error) {
	memberWallet := normalizeWalletAddress(authUser.WalletAddress)
	if memberWallet == "" {
		return nil, errors.New("authenticated wallet address is invalid")
	}

	if _, err := s.findMembershipRole(ctx, groupID, memberWallet); err != nil {
		return nil, err
	}

	cursor, err := s.cycleArchivesCollection.Find(
		ctx,
		bson.M{"group_id": groupID},
		options.Find().SetSort(bson.D{{Key: "closed_at", Value: -1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find cycle archives: %w", err)
	}
	defer cursor.Close(ctx)

	archives := make([]ArchiveSummary, 0)
	for cursor.Next(ctx) {
		var archive ArchiveSummary
		if err := cursor.Decode(&archive); err != nil {
			return nil, fmt.Errorf("decode cycle archive: %w", err)
		}
		archives = append(archives, archive)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate cycle archives: %w", err)
	}

	return archives, nil
}

func (s *Store) FindArchiveByID(ctx context.Context, groupID string, archiveID string) (ArchiveSummary, error) {
	var archive ArchiveSummary
	if err := s.cycleArchivesCollection.FindOne(ctx, bson.M{
		"_id":      archiveID,
		"group_id": groupID,
	}).Decode(&archive); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return ArchiveSummary{}, ErrCycleNotFound
		}
		return ArchiveSummary{}, fmt.Errorf("find cycle archive: %w", err)
	}

	return archive, nil
}

func (s *Store) LoadArchiveSeed(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
) (Cycle, archiveSeed, error) {
	memberWallet := normalizeWalletAddress(authUser.WalletAddress)
	if memberWallet == "" {
		return Cycle{}, archiveSeed{}, errors.New("authenticated wallet address is invalid")
	}

	membershipRole, err := s.findMembershipRole(ctx, groupID, memberWallet)
	if err != nil {
		return Cycle{}, archiveSeed{}, err
	}
	if membershipRole != "owner" {
		return Cycle{}, archiveSeed{}, ErrOnlyOwnerCanCloseCycle
	}

	group, err := s.findGroup(ctx, groupID)
	if err != nil {
		return Cycle{}, archiveSeed{}, err
	}

	cycle, err := s.findCycle(ctx, groupID, cycleID)
	if err != nil {
		return Cycle{}, archiveSeed{}, err
	}

	memberships, err := s.loadMemberships(ctx, groupID)
	if err != nil {
		return Cycle{}, archiveSeed{}, err
	}

	expenses, err := s.loadArchiveExpenses(ctx, groupID, cycleID)
	if err != nil {
		return Cycle{}, archiveSeed{}, err
	}

	return cycle, archiveSeed{
		ArchiveID: prefixedID("arc"),
		Group: ArchiveGroup{
			ID:          group.ID,
			Name:        group.Name,
			OwnerWallet: group.OwnerWallet,
			InviteCode:  group.InviteCode,
			MemberCount: group.MemberCount,
		},
		Members:  memberships,
		Expenses: expenses,
		ClosedAt: time.Now().UTC(),
	}, nil
}

func (s *Store) ArchiveAndDeleteCycle(ctx context.Context, archive ArchiveSummary) error {
	if _, err := s.cycleArchivesCollection.InsertOne(ctx, archive); err != nil {
		return fmt.Errorf("insert cycle archive: %w", err)
	}

	expenseIDs, err := s.loadExpenseIDs(ctx, archive.GroupID, archive.CycleID)
	if err != nil {
		return err
	}

	if _, err := s.paymentsCollection.DeleteMany(ctx, bson.M{
		"group_id": archive.GroupID,
		"cycle_id": archive.CycleID,
	}); err != nil {
		return fmt.Errorf("delete settlement payments: %w", err)
	}

	if len(expenseIDs) > 0 {
		if _, err := s.splitsCollection.DeleteMany(ctx, bson.M{"expense_id": bson.M{"$in": expenseIDs}}); err != nil {
			return fmt.Errorf("delete expense splits: %w", err)
		}
		if _, err := s.deleteApprovalsCollection.DeleteMany(ctx, bson.M{"expense_id": bson.M{"$in": expenseIDs}}); err != nil {
			return fmt.Errorf("delete expense delete approvals: %w", err)
		}
	}

	if _, err := s.expensesCollection.DeleteMany(ctx, bson.M{
		"group_id": archive.GroupID,
		"cycle_id": archive.CycleID,
	}); err != nil {
		return fmt.Errorf("delete expenses: %w", err)
	}

	if _, err := s.cyclesCollection.DeleteOne(ctx, bson.M{
		"_id":      archive.CycleID,
		"group_id": archive.GroupID,
	}); err != nil {
		return fmt.Errorf("delete settlement cycle: %w", err)
	}

	if _, err := s.groupsCollection.UpdateOne(ctx, bson.M{"_id": archive.GroupID}, bson.M{
		"$set": bson.M{"updated_at": time.Now().UTC()},
	}); err != nil {
		return fmt.Errorf("touch group after archive: %w", err)
	}

	return nil
}

func (s *Store) groupExists(ctx context.Context, groupID string) (bool, error) {
	count, err := s.groupsCollection.CountDocuments(ctx, bson.M{"_id": groupID})
	if err != nil {
		return false, fmt.Errorf("count groups: %w", err)
	}
	return count > 0, nil
}

func (s *Store) countSettlementCycles(ctx context.Context, groupID string) (int64, error) {
	activeCycleCount, err := s.cyclesCollection.CountDocuments(ctx, bson.M{"group_id": groupID})
	if err != nil {
		return 0, fmt.Errorf("count settlement cycles: %w", err)
	}

	return activeCycleCount, nil
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

func (s *Store) findGroup(ctx context.Context, groupID string) (groupDocument, error) {
	var group groupDocument
	if err := s.groupsCollection.FindOne(ctx, bson.M{"_id": groupID}).Decode(&group); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return groupDocument{}, ErrGroupNotFound
		}
		return groupDocument{}, fmt.Errorf("find group: %w", err)
	}
	return group, nil
}

func (s *Store) findCycle(ctx context.Context, groupID string, cycleID string) (Cycle, error) {
	var document cycleDocument
	if err := s.cyclesCollection.FindOne(ctx, bson.M{
		"_id":      cycleID,
		"group_id": groupID,
	}).Decode(&document); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return Cycle{}, ErrCycleNotFound
		}
		return Cycle{}, fmt.Errorf("find settlement cycle: %w", err)
	}

	return Cycle{
		ID:              document.ID,
		GroupID:         document.GroupID,
		Name:            document.Name,
		Status:          document.Status,
		CreatedByWallet: document.CreatedByWallet,
		CreatedAt:       document.CreatedAt,
		UpdatedAt:       document.UpdatedAt,
	}, nil
}

func (s *Store) loadMemberships(ctx context.Context, groupID string) ([]ArchiveMember, error) {
	cursor, err := s.membershipsCollection.Find(
		ctx,
		bson.M{"group_id": groupID},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find group memberships: %w", err)
	}
	defer cursor.Close(ctx)

	documents := make([]membershipDocument, 0)
	walletAddresses := make([]string, 0)
	for cursor.Next(ctx) {
		var membership membershipDocument
		if err := cursor.Decode(&membership); err != nil {
			return nil, fmt.Errorf("decode group membership: %w", err)
		}
		documents = append(documents, membership)
		walletAddresses = append(walletAddresses, membership.WalletAddress)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate group memberships: %w", err)
	}

	displayNamesByWallet, err := s.loadDisplayNamesByWallet(ctx, walletAddresses)
	if err != nil {
		return nil, err
	}

	members := make([]ArchiveMember, 0, len(documents))
	for _, membership := range documents {
		members = append(members, ArchiveMember{
			WalletAddress: membership.WalletAddress,
			DisplayName:   displayNamesByWallet[membership.WalletAddress],
			Role:          membership.Role,
			JoinedAt:      membership.CreatedAt,
		})
	}
	return members, nil
}

func (s *Store) loadArchiveExpenses(ctx context.Context, groupID string, cycleID string) ([]ArchiveExpense, error) {
	cursor, err := s.expensesCollection.Find(
		ctx,
		bson.M{"group_id": groupID, "cycle_id": cycleID},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find expenses: %w", err)
	}
	defer cursor.Close(ctx)

	expenseDocuments := make([]expenseDocument, 0)
	expenseIDs := make([]string, 0)
	walletAddresses := make([]string, 0)
	for cursor.Next(ctx) {
		var expense expenseDocument
		if err := cursor.Decode(&expense); err != nil {
			return nil, fmt.Errorf("decode expense: %w", err)
		}
		expenseDocuments = append(expenseDocuments, expense)
		expenseIDs = append(expenseIDs, expense.ID)
		walletAddresses = append(walletAddresses, expense.PaidByWallet)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate expenses: %w", err)
	}
	if len(expenseDocuments) == 0 {
		return []ArchiveExpense{}, nil
	}

	splitsByExpenseID, splitWallets, err := s.loadSplitsByExpenseID(ctx, expenseIDs)
	if err != nil {
		return nil, err
	}
	walletAddresses = append(walletAddresses, splitWallets...)

	deletePendingByExpenseID, err := s.loadDeletePendingByExpenseID(ctx, expenseIDs)
	if err != nil {
		return nil, err
	}

	displayNamesByWallet, err := s.loadDisplayNamesByWallet(ctx, walletAddresses)
	if err != nil {
		return nil, err
	}

	expenses := make([]ArchiveExpense, 0, len(expenseDocuments))
	for _, expense := range expenseDocuments {
		splits := make([]ArchiveExpenseSplit, 0, len(splitsByExpenseID[expense.ID]))
		for _, split := range splitsByExpenseID[expense.ID] {
			splits = append(splits, ArchiveExpenseSplit{
				WalletAddress: split.WalletAddress,
				DisplayName:   displayNamesByWallet[split.WalletAddress],
				Amount:        centsToCurrency(split.AmountCents),
			})
		}

		expenses = append(expenses, ArchiveExpense{
			ID:                expense.ID,
			Description:       expense.Description,
			Amount:            centsToCurrency(expense.AmountCents),
			PaidByWallet:      expense.PaidByWallet,
			PaidByDisplayName: displayNamesByWallet[expense.PaidByWallet],
			CreatedByWallet:   expense.CreatedByWallet,
			CreatedAt:         expense.CreatedAt,
			UpdatedAt:         expense.UpdatedAt,
			DeletePending:     deletePendingByExpenseID[expense.ID],
			Splits:            splits,
		})
	}

	return expenses, nil
}

func (s *Store) loadSplitsByExpenseID(ctx context.Context, expenseIDs []string) (map[string][]splitDocument, []string, error) {
	cursor, err := s.splitsCollection.Find(
		ctx,
		bson.M{"expense_id": bson.M{"$in": expenseIDs}},
		options.Find().SetSort(bson.D{{Key: "position", Value: 1}}),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("find expense splits: %w", err)
	}
	defer cursor.Close(ctx)

	splitsByExpenseID := make(map[string][]splitDocument)
	walletSet := make(map[string]struct{})
	for cursor.Next(ctx) {
		var split splitDocument
		if err := cursor.Decode(&split); err != nil {
			return nil, nil, fmt.Errorf("decode expense split: %w", err)
		}
		splitsByExpenseID[split.ExpenseID] = append(splitsByExpenseID[split.ExpenseID], split)
		walletSet[split.WalletAddress] = struct{}{}
	}
	if err := cursor.Err(); err != nil {
		return nil, nil, fmt.Errorf("iterate expense splits: %w", err)
	}

	walletAddresses := make([]string, 0, len(walletSet))
	for walletAddress := range walletSet {
		walletAddresses = append(walletAddresses, walletAddress)
	}
	sort.Strings(walletAddresses)

	return splitsByExpenseID, walletAddresses, nil
}

func (s *Store) loadDeletePendingByExpenseID(ctx context.Context, expenseIDs []string) (map[string]bool, error) {
	cursor, err := s.deleteApprovalsCollection.Find(ctx, bson.M{
		"expense_id": bson.M{"$in": expenseIDs},
	})
	if err != nil {
		return nil, fmt.Errorf("find expense delete approvals: %w", err)
	}
	defer cursor.Close(ctx)

	deletePendingByExpenseID := make(map[string]bool, len(expenseIDs))
	for cursor.Next(ctx) {
		var document struct {
			ExpenseID string `bson:"expense_id"`
		}
		if err := cursor.Decode(&document); err != nil {
			return nil, fmt.Errorf("decode expense delete approval: %w", err)
		}
		deletePendingByExpenseID[document.ExpenseID] = true
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate expense delete approvals: %w", err)
	}

	return deletePendingByExpenseID, nil
}

func (s *Store) loadExpenseIDs(ctx context.Context, groupID string, cycleID string) ([]string, error) {
	cursor, err := s.expensesCollection.Find(ctx, bson.M{
		"group_id": groupID,
		"cycle_id": cycleID,
	}, options.Find().SetProjection(bson.M{"_id": 1}))
	if err != nil {
		return nil, fmt.Errorf("find expense ids: %w", err)
	}
	defer cursor.Close(ctx)

	expenseIDs := make([]string, 0)
	for cursor.Next(ctx) {
		var document struct {
			ID string `bson:"_id"`
		}
		if err := cursor.Decode(&document); err != nil {
			return nil, fmt.Errorf("decode expense id: %w", err)
		}
		expenseIDs = append(expenseIDs, document.ID)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate expense ids: %w", err)
	}

	return expenseIDs, nil
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

func centsToCurrency(value int64) float64 {
	return float64(value) / 100
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

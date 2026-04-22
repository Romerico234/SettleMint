package expenses

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"settlemint-service/internal/modules/auth"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const cycleStatusActive = "Active"

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
	ID            string `bson:"_id"`
	ExpenseID     string `bson:"expense_id"`
	GroupID       string `bson:"group_id"`
	CycleID       string `bson:"cycle_id"`
	WalletAddress string `bson:"wallet_address"`
	AmountCents   int64  `bson:"amount_cents"`
	Position      int    `bson:"position"`
}

type expenseDeleteApprovalDocument struct {
	ID            string    `bson:"_id"`
	ExpenseID     string    `bson:"expense_id"`
	GroupID       string    `bson:"group_id"`
	CycleID       string    `bson:"cycle_id"`
	WalletAddress string    `bson:"wallet_address"`
	CreatedAt     time.Time `bson:"created_at"`
}

type cycleDocument struct {
	ID      string `bson:"_id"`
	GroupID string `bson:"group_id"`
	Status  string `bson:"status"`
}

type Store struct {
	expensesCollection    *mongo.Collection
	splitsCollection      *mongo.Collection
	deleteApprovalsCollection *mongo.Collection
	cyclesCollection      *mongo.Collection
	membershipsCollection *mongo.Collection
	profilesCollection    *mongo.Collection
}

func NewDatastore(database *mongo.Database) *Store {
	return &Store{
		expensesCollection:    database.Collection("expenses"),
		splitsCollection:      database.Collection("expense_splits"),
		deleteApprovalsCollection: database.Collection("expense_delete_approvals"),
		cyclesCollection:      database.Collection("cycles"),
		membershipsCollection: database.Collection("group_memberships"),
		profilesCollection:    database.Collection("user_profiles"),
	}
}

func (s *Store) CreateExpense(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
	input CreateExpenseRequest,
) (Expense, error) {
	memberWallet := normalizeWalletAddress(authUser.WalletAddress)
	if memberWallet == "" {
		return Expense{}, errors.New("authenticated wallet address is invalid")
	}

	if _, err := s.findMembershipRole(ctx, groupID, memberWallet); err != nil {
		return Expense{}, err
	}

	cycle, err := s.findCycle(ctx, groupID, cycleID)
	if err != nil {
		return Expense{}, err
	}
	if cycle.Status != cycleStatusActive {
		return Expense{}, ErrCycleArchived
	}

	groupMemberSet, err := s.loadGroupMemberSet(ctx, groupID)
	if err != nil {
		return Expense{}, err
	}

	paidByWallet := normalizeWalletAddress(input.PaidByWallet)
	if paidByWallet == "" || !groupMemberSet[paidByWallet] {
		return Expense{}, ErrExpensePaidByMustBeMember
	}

	amountCents, err := currencyToCents(input.Amount)
	if err != nil {
		return Expense{}, err
	}

	splitDocuments, err := buildSplitDocuments(input.Splits, groupID, cycleID, amountCents, groupMemberSet)
	if err != nil {
		return Expense{}, err
	}

	now := time.Now().UTC()
	expenseDocument := expenseDocument{
		ID:              prefixedID("exp"),
		GroupID:         groupID,
		CycleID:         cycleID,
		Description:     input.Description,
		AmountCents:     amountCents,
		PaidByWallet:    paidByWallet,
		CreatedByWallet: memberWallet,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if _, err := s.expensesCollection.InsertOne(ctx, expenseDocument); err != nil {
		return Expense{}, fmt.Errorf("insert expense: %w", err)
	}

	if len(splitDocuments) > 0 {
		documents := make([]any, 0, len(splitDocuments))
		for index := range splitDocuments {
			splitDocuments[index].ExpenseID = expenseDocument.ID
			documents = append(documents, splitDocuments[index])
		}

		if _, err := s.splitsCollection.InsertMany(ctx, documents); err != nil {
			if _, rollbackErr := s.expensesCollection.DeleteOne(ctx, bson.M{"_id": expenseDocument.ID}); rollbackErr != nil {
				return Expense{}, fmt.Errorf("insert expense splits: %w (rollback expense: %v)", err, rollbackErr)
			}
			return Expense{}, fmt.Errorf("insert expense splits: %w", err)
		}
	}

	return s.buildExpenseResponse(ctx, expenseDocument, splitDocuments, len(groupMemberSet))
}

func (s *Store) ListExpenses(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
) ([]Expense, error) {
	memberWallet := normalizeWalletAddress(authUser.WalletAddress)
	if memberWallet == "" {
		return nil, errors.New("authenticated wallet address is invalid")
	}

	if _, err := s.findMembershipRole(ctx, groupID, memberWallet); err != nil {
		return nil, err
	}
	if _, err := s.findCycle(ctx, groupID, cycleID); err != nil {
		return nil, err
	}

	cursor, err := s.expensesCollection.Find(
		ctx,
		bson.M{"group_id": groupID, "cycle_id": cycleID},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find expenses: %w", err)
	}
	defer cursor.Close(ctx)

	expenseDocuments := make([]expenseDocument, 0)
	expenseIDs := make([]string, 0)
	for cursor.Next(ctx) {
		var document expenseDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, fmt.Errorf("decode expense: %w", err)
		}
		expenseDocuments = append(expenseDocuments, document)
		expenseIDs = append(expenseIDs, document.ID)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate expenses: %w", err)
	}
	if len(expenseDocuments) == 0 {
		return []Expense{}, nil
	}

	splitsByExpenseID, err := s.loadSplitsByExpenseID(ctx, expenseIDs)
	if err != nil {
		return nil, err
	}
	deleteApprovalSummaryByExpenseID, err := s.loadDeleteApprovalSummaryByExpenseID(
		ctx,
		expenseIDs,
		memberWallet,
	)
	if err != nil {
		return nil, err
	}
	requiredApprovalCount, err := s.countGroupMembers(ctx, groupID)
	if err != nil {
		return nil, err
	}

	walletAddresses := make([]string, 0)
	seenWallets := make(map[string]struct{})
	for _, document := range expenseDocuments {
		if _, ok := seenWallets[document.PaidByWallet]; !ok {
			seenWallets[document.PaidByWallet] = struct{}{}
			walletAddresses = append(walletAddresses, document.PaidByWallet)
		}

		for _, split := range splitsByExpenseID[document.ID] {
			if _, ok := seenWallets[split.WalletAddress]; ok {
				continue
			}

			seenWallets[split.WalletAddress] = struct{}{}
			walletAddresses = append(walletAddresses, split.WalletAddress)
		}
	}

	displayNameByWallet, err := s.loadDisplayNamesByWallet(ctx, walletAddresses)
	if err != nil {
		return nil, err
	}

	expenses := make([]Expense, 0, len(expenseDocuments))
	for _, document := range expenseDocuments {
		splits := make([]ExpenseSplit, 0, len(splitsByExpenseID[document.ID]))
		for _, split := range splitsByExpenseID[document.ID] {
			splits = append(splits, ExpenseSplit{
				WalletAddress: split.WalletAddress,
				DisplayName:   displayNameByWallet[split.WalletAddress],
				Amount:        centsToCurrency(split.AmountCents),
			})
		}

		expenses = append(expenses, Expense{
			ID:                document.ID,
			GroupID:           document.GroupID,
			CycleID:           document.CycleID,
			Description:       document.Description,
			Amount:            centsToCurrency(document.AmountCents),
			PaidByWallet:      document.PaidByWallet,
			PaidByDisplayName: displayNameByWallet[document.PaidByWallet],
			CreatedByWallet:   document.CreatedByWallet,
			CreatedAt:         document.CreatedAt,
			UpdatedAt:         document.UpdatedAt,
			Splits:            splits,
			DeleteApprovalCount:         deleteApprovalSummaryByExpenseID[document.ID].ApprovalCount,
			DeleteRequiredApprovalCount: requiredApprovalCount,
			DeleteApprovedByCurrentUser: deleteApprovalSummaryByExpenseID[document.ID].ApprovedByCurrentUser,
			DeletePending:               deleteApprovalSummaryByExpenseID[document.ID].ApprovalCount > 0,
		})
	}

	return expenses, nil
}

func (s *Store) buildExpenseResponse(
	ctx context.Context,
	document expenseDocument,
	splitDocuments []splitDocument,
	requiredApprovalCount int,
) (Expense, error) {
	walletAddresses := []string{document.PaidByWallet}
	for _, split := range splitDocuments {
		walletAddresses = append(walletAddresses, split.WalletAddress)
	}

	displayNameByWallet, err := s.loadDisplayNamesByWallet(ctx, walletAddresses)
	if err != nil {
		return Expense{}, err
	}

	splits := make([]ExpenseSplit, 0, len(splitDocuments))
	for _, split := range splitDocuments {
		splits = append(splits, ExpenseSplit{
			WalletAddress: split.WalletAddress,
			DisplayName:   displayNameByWallet[split.WalletAddress],
			Amount:        centsToCurrency(split.AmountCents),
		})
	}

	return Expense{
		ID:                document.ID,
		GroupID:           document.GroupID,
		CycleID:           document.CycleID,
		Description:       document.Description,
		Amount:            centsToCurrency(document.AmountCents),
		PaidByWallet:      document.PaidByWallet,
		PaidByDisplayName: displayNameByWallet[document.PaidByWallet],
		CreatedByWallet:   document.CreatedByWallet,
		CreatedAt:         document.CreatedAt,
		UpdatedAt:         document.UpdatedAt,
		Splits:            splits,
		DeleteApprovalCount:         0,
		DeleteRequiredApprovalCount: requiredApprovalCount,
		DeleteApprovedByCurrentUser: false,
		DeletePending:               false,
	}, nil
}

func (s *Store) ApproveExpenseDelete(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
	expenseID string,
) (ExpenseDeleteApprovalResponse, error) {
	memberWallet := normalizeWalletAddress(authUser.WalletAddress)
	if memberWallet == "" {
		return ExpenseDeleteApprovalResponse{}, errors.New("authenticated wallet address is invalid")
	}

	if _, err := s.findMembershipRole(ctx, groupID, memberWallet); err != nil {
		return ExpenseDeleteApprovalResponse{}, err
	}
	if _, err := s.findCycle(ctx, groupID, cycleID); err != nil {
		return ExpenseDeleteApprovalResponse{}, err
	}
	if _, err := s.findExpense(ctx, groupID, cycleID, expenseID); err != nil {
		return ExpenseDeleteApprovalResponse{}, err
	}

	requiredApprovalCount, err := s.countGroupMembers(ctx, groupID)
	if err != nil {
		return ExpenseDeleteApprovalResponse{}, err
	}

	existingApprovalCount, err := s.deleteApprovalsCollection.CountDocuments(ctx, bson.M{
		"expense_id":      expenseID,
		"wallet_address": memberWallet,
	})
	if err != nil {
		return ExpenseDeleteApprovalResponse{}, fmt.Errorf("count expense delete approvals: %w", err)
	}
	if existingApprovalCount > 0 {
		return ExpenseDeleteApprovalResponse{}, ErrExpenseDeleteAlreadyApproved
	}

	if _, err := s.deleteApprovalsCollection.InsertOne(ctx, expenseDeleteApprovalDocument{
		ID:            prefixedID("eda"),
		ExpenseID:     expenseID,
		GroupID:       groupID,
		CycleID:       cycleID,
		WalletAddress: memberWallet,
		CreatedAt:     time.Now().UTC(),
	}); err != nil {
		return ExpenseDeleteApprovalResponse{}, fmt.Errorf("insert expense delete approval: %w", err)
	}

	approvalCount, err := s.deleteApprovalsCollection.CountDocuments(ctx, bson.M{"expense_id": expenseID})
	if err != nil {
		return ExpenseDeleteApprovalResponse{}, fmt.Errorf("count expense delete approvals: %w", err)
	}

	response := ExpenseDeleteApprovalResponse{
		Status:                "pending",
		ExpenseID:             expenseID,
		ApprovalCount:         int(approvalCount),
		RequiredApprovalCount: requiredApprovalCount,
	}

	if response.ApprovalCount < requiredApprovalCount {
		return response, nil
	}

	if _, err := s.splitsCollection.DeleteMany(ctx, bson.M{"expense_id": expenseID}); err != nil {
		return ExpenseDeleteApprovalResponse{}, fmt.Errorf("delete expense splits: %w", err)
	}
	if _, err := s.deleteApprovalsCollection.DeleteMany(ctx, bson.M{"expense_id": expenseID}); err != nil {
		return ExpenseDeleteApprovalResponse{}, fmt.Errorf("delete expense approvals: %w", err)
	}
	if _, err := s.expensesCollection.DeleteOne(ctx, bson.M{"_id": expenseID}); err != nil {
		return ExpenseDeleteApprovalResponse{}, fmt.Errorf("delete expense: %w", err)
	}

	response.Status = "deleted"
	return response, nil
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

func (s *Store) findCycle(ctx context.Context, groupID string, cycleID string) (cycleDocument, error) {
	var document cycleDocument
	if err := s.cyclesCollection.FindOne(ctx, bson.M{
		"_id":      cycleID,
		"group_id": groupID,
	}).Decode(&document); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return cycleDocument{}, ErrCycleNotFound
		}
		return cycleDocument{}, fmt.Errorf("find settlement cycle: %w", err)
	}

	return document, nil
}

func (s *Store) findExpense(ctx context.Context, groupID string, cycleID string, expenseID string) (expenseDocument, error) {
	var document expenseDocument
	if err := s.expensesCollection.FindOne(ctx, bson.M{
		"_id":      expenseID,
		"group_id": groupID,
		"cycle_id": cycleID,
	}).Decode(&document); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return expenseDocument{}, ErrExpenseNotFound
		}
		return expenseDocument{}, fmt.Errorf("find expense: %w", err)
	}

	return document, nil
}

func (s *Store) loadGroupMemberSet(ctx context.Context, groupID string) (map[string]bool, error) {
	cursor, err := s.membershipsCollection.Find(ctx, bson.M{"group_id": groupID})
	if err != nil {
		return nil, fmt.Errorf("find group memberships: %w", err)
	}
	defer cursor.Close(ctx)

	memberSet := make(map[string]bool)
	for cursor.Next(ctx) {
		var membership struct {
			WalletAddress string `bson:"wallet_address"`
		}
		if err := cursor.Decode(&membership); err != nil {
			return nil, fmt.Errorf("decode group membership: %w", err)
		}
		memberSet[membership.WalletAddress] = true
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate group memberships: %w", err)
	}

	return memberSet, nil
}

func (s *Store) loadSplitsByExpenseID(ctx context.Context, expenseIDs []string) (map[string][]splitDocument, error) {
	cursor, err := s.splitsCollection.Find(
		ctx,
		bson.M{"expense_id": bson.M{"$in": expenseIDs}},
		options.Find().SetSort(bson.D{{Key: "position", Value: 1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("find expense splits: %w", err)
	}
	defer cursor.Close(ctx)

	splitsByExpenseID := make(map[string][]splitDocument)
	for cursor.Next(ctx) {
		var document splitDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, fmt.Errorf("decode expense split: %w", err)
		}
		splitsByExpenseID[document.ExpenseID] = append(splitsByExpenseID[document.ExpenseID], document)
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate expense splits: %w", err)
	}

	return splitsByExpenseID, nil
}

func (s *Store) loadDeleteApprovalSummaryByExpenseID(
	ctx context.Context,
	expenseIDs []string,
	currentWallet string,
) (map[string]struct {
	ApprovalCount         int
	ApprovedByCurrentUser bool
}, error) {
	cursor, err := s.deleteApprovalsCollection.Find(ctx, bson.M{"expense_id": bson.M{"$in": expenseIDs}})
	if err != nil {
		return nil, fmt.Errorf("find expense delete approvals: %w", err)
	}
	defer cursor.Close(ctx)

	summaryByExpenseID := make(map[string]struct {
		ApprovalCount         int
		ApprovedByCurrentUser bool
	})
	for cursor.Next(ctx) {
		var document expenseDeleteApprovalDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, fmt.Errorf("decode expense delete approval: %w", err)
		}

		summary := summaryByExpenseID[document.ExpenseID]
		summary.ApprovalCount += 1
		if document.WalletAddress == currentWallet {
			summary.ApprovedByCurrentUser = true
		}
		summaryByExpenseID[document.ExpenseID] = summary
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("iterate expense delete approvals: %w", err)
	}

	return summaryByExpenseID, nil
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

func (s *Store) countGroupMembers(ctx context.Context, groupID string) (int, error) {
	memberCount, err := s.membershipsCollection.CountDocuments(ctx, bson.M{"group_id": groupID})
	if err != nil {
		return 0, fmt.Errorf("count group members: %w", err)
	}

	return int(memberCount), nil
}

func buildSplitDocuments(
	splits []CreateExpenseSplitRequest,
	groupID string,
	cycleID string,
	amountCents int64,
	groupMemberSet map[string]bool,
) ([]splitDocument, error) {
	if len(splits) == 0 {
		return nil, ErrExpenseSplitRequired
	}

	splitDocuments := make([]splitDocument, 0, len(splits))
	totalSplitCents := int64(0)
	seenWallets := make(map[string]struct{}, len(splits))

	for index, split := range splits {
		walletAddress := normalizeWalletAddress(split.WalletAddress)
		if walletAddress == "" || !groupMemberSet[walletAddress] {
			return nil, ErrExpenseSplitMemberRequired
		}
		if _, exists := seenWallets[walletAddress]; exists {
			return nil, ErrExpenseDuplicateSplitMember
		}

		splitAmountCents, err := currencyToCents(split.Amount)
		if err != nil {
			return nil, err
		}

		seenWallets[walletAddress] = struct{}{}
		totalSplitCents += splitAmountCents
		splitDocuments = append(splitDocuments, splitDocument{
			ID:            prefixedID("spt"),
			GroupID:       groupID,
			CycleID:       cycleID,
			WalletAddress: walletAddress,
			AmountCents:   splitAmountCents,
			Position:      index,
		})
	}

	if totalSplitCents != amountCents {
		return nil, ErrExpenseSplitTotalMismatch
	}

	return splitDocuments, nil
}

func currencyToCents(value float64) (int64, error) {
	if value <= 0 {
		return 0, ErrInvalidAmount
	}

	cents := math.Round(value * 100)
	if math.Abs((cents/100)-value) > 0.000001 {
		return 0, ErrInvalidAmountPrecision
	}

	return int64(cents), nil
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

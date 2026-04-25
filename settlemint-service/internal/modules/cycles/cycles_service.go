package cycles

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"

	"settlemint-service/internal/core/ipfs"
	"settlemint-service/internal/modules/auth"
	settlementPlan "settlemint-service/internal/modules/settlement-plan"
)

var (
	ErrGroupNotFound            = errors.New("group not found")
	ErrGroupMembershipRequired  = errors.New("you are not a member of this group")
	ErrOnlyOwnerCanCreateCycle  = errors.New("only the group owner can create a settlement cycle")
	ErrOnlyOwnerCanCloseCycle   = errors.New("only the group owner can close the settlement cycle")
	ErrCycleNotFound            = errors.New("settlement cycle not found")
	ErrCycleAlreadyClosed       = errors.New("settlement cycle is already closed")
	ErrCycleHasOutstandingItems = errors.New("all settlement obligations must be verified before closing the cycle")
)

type settlementPlanner interface {
	BuildSummary(ctx context.Context, authUser auth.User, groupID string, cycleID string) (settlementPlan.Summary, error)
}

type Service struct {
	store   *Store
	planner settlementPlanner
}

func NewService(store *Store, planner settlementPlanner) *Service {
	return &Service{
		store:   store,
		planner: planner,
	}
}

func (s *Service) CreateCycle(ctx context.Context, authUser auth.User, groupID string, input CreateCycleRequest) (Cycle, error) {
	input.Name = strings.TrimSpace(input.Name)
	return s.store.CreateCycle(ctx, authUser, strings.TrimSpace(groupID), input)
}

func (s *Service) ListCycles(ctx context.Context, authUser auth.User, groupID string) ([]Cycle, error) {
	return s.store.ListCyclesByGroup(ctx, authUser, strings.TrimSpace(groupID))
}

func (s *Service) ListArchives(ctx context.Context, authUser auth.User, groupID string) ([]ArchiveSummary, error) {
	return s.store.ListArchivesByGroup(ctx, authUser, strings.TrimSpace(groupID))
}

func (s *Service) CloseCycle(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	cycleID string,
	input CloseCycleRequest,
) (ArchiveSummary, error) {
	groupID = strings.TrimSpace(groupID)
	cycleID = strings.TrimSpace(cycleID)
	input.ArchiveNotes = strings.TrimSpace(input.ArchiveNotes)

	cycle, archiveSeed, err := s.store.LoadArchiveSeed(ctx, authUser, groupID, cycleID)
	if err != nil {
		return ArchiveSummary{}, err
	}
	if cycle.Status != StatusActive {
		return ArchiveSummary{}, ErrCycleAlreadyClosed
	}

	summary, err := s.planner.BuildSummary(ctx, authUser, groupID, cycleID)
	if err != nil {
		return ArchiveSummary{}, err
	}
	if !cycleCanClose(summary) {
		return ArchiveSummary{}, ErrCycleHasOutstandingItems
	}

	snapshot := ArchiveCycleSnapshot{
		SchemaVersion:  "2026-04-25",
		Group:          archiveSeed.Group,
		Cycle:          cycle,
		ClosedByWallet: strings.ToLower(strings.TrimSpace(authUser.WalletAddress)),
		ClosedAt:       archiveSeed.ClosedAt,
		ArchiveNotes:   input.ArchiveNotes,
		Members:        archiveSeed.Members,
		Expenses:       archiveSeed.Expenses,
		Summary:        summary,
	}

	archivePayloadSHA256, err := archivePayloadSHA256(snapshot)
	if err != nil {
		return ArchiveSummary{}, err
	}

	archive := ArchiveRecord{
		ArchiveSummary: ArchiveSummary{
			ID:                   archiveSeed.ArchiveID,
			GroupID:              groupID,
			CycleID:              cycleID,
			CycleName:            cycle.Name,
			Status:               StatusArchived,
			ArchiveCID:           ipfs.PendingArchiveCID(archiveSeed.ArchiveID),
			ArchiveHTTPURL:       archiveHTTPURL(ipfs.PendingArchiveCID(archiveSeed.ArchiveID)),
			ArchiveProvider:      "ipfs",
			ArchiveMode:          "pending",
			ArchivePayloadSHA256: archivePayloadSHA256,
			ClosedByWallet:       snapshot.ClosedByWallet,
			ClosedAt:             archiveSeed.ClosedAt,
			CreatedAt:            cycle.CreatedAt,
			ExpenseCount:         len(snapshot.Expenses),
			PaymentCount:         len(summary.Payments),
			VerifiedPaymentCount: countVerifiedPayments(summary.Payments),
			TotalExpenses:        summary.TotalExpenses,
		},
		Snapshot: snapshot,
	}

	if err := s.store.ArchiveAndDeleteCycle(ctx, archive); err != nil {
		return ArchiveSummary{}, err
	}

	return archive.ArchiveSummary, nil
}

func cycleCanClose(summary settlementPlan.Summary) bool {
	for _, settlement := range summary.Settlements {
		if settlement.Status != "Verified" {
			return false
		}
	}
	for _, payment := range summary.Payments {
		if payment.Status != "Verified" && payment.Status != "Rejected" {
			return false
		}
	}
	return true
}

func countVerifiedPayments(payments []settlementPlan.PaymentRecord) int {
	total := 0
	for _, payment := range payments {
		if payment.Status == "Verified" {
			total++
		}
	}
	return total
}

func archivePayloadSHA256(snapshot ArchiveCycleSnapshot) (string, error) {
	rawSnapshot, err := json.Marshal(snapshot)
	if err != nil {
		return "", err
	}

	hash := sha256.Sum256(rawSnapshot)
	return hex.EncodeToString(hash[:]), nil
}

func archiveHTTPURL(archiveCID string) string {
	return "https://ipfs.io/ipfs/" + strings.TrimSpace(archiveCID)
}

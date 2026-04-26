package cycles

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"settlemint-service/internal/core/ipfs"
	"settlemint-service/internal/modules/auth"
	settlementPlan "settlemint-service/internal/modules/settlement-plan"
)

var (
	ErrGroupNotFound               = errors.New("group not found")
	ErrGroupMembershipRequired     = errors.New("you are not a member of this group")
	ErrOnlyOwnerCanCreateCycle     = errors.New("only the group owner can create a settlement cycle")
	ErrOnlyOwnerCanCloseCycle      = errors.New("only the group owner can close the settlement cycle")
	ErrSettlementCycleLimitReached = errors.New("group can only have 10 settlement cycles")
	ErrCycleNotFound               = errors.New("settlement cycle not found")
	ErrArchiveNotFound             = errors.New("settlement cycle archive not found")
	ErrCycleAlreadyClosed          = errors.New("settlement cycle is already closed")
	ErrCycleHasOutstandingItems    = errors.New("all settlement obligations must be verified before closing the cycle")
	ErrArchivePayloadMismatch      = errors.New("archived cycle payload hash mismatch")
)

type settlementPlanner interface {
	BuildSummary(ctx context.Context, authUser auth.User, groupID string, cycleID string) (settlementPlan.Summary, error)
}

type Service struct {
	store   *Store
	planner settlementPlanner
	ipfs    ipfs.Client
}

func NewService(store *Store, planner settlementPlanner, ipfsClient ipfs.Client) *Service {
	return &Service{
		store:   store,
		planner: planner,
		ipfs:    ipfsClient,
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

func (s *Service) GetArchiveSnapshot(
	ctx context.Context,
	authUser auth.User,
	groupID string,
	archiveID string,
) (ArchiveCycleSnapshot, error) {
	archive, err := s.store.FindArchiveByID(ctx, authUser, strings.TrimSpace(groupID), strings.TrimSpace(archiveID))
	if err != nil {
		if errors.Is(err, ErrCycleNotFound) {
			return ArchiveCycleSnapshot{}, ErrArchiveNotFound
		}
		return ArchiveCycleSnapshot{}, err
	}

	rawSnapshot, err := s.ipfs.GetJSONByCID(ctx, archive.ArchiveCID)
	if err != nil {
		return ArchiveCycleSnapshot{}, fmt.Errorf("fetch archive json from ipfs by cid: %w", err)
	}

	var snapshot ArchiveCycleSnapshot
	if err := json.Unmarshal(rawSnapshot, &snapshot); err != nil {
		return ArchiveCycleSnapshot{}, fmt.Errorf("decode archive json from ipfs: %w", err)
	}

	payloadSHA256, err := archivePayloadSHA256(snapshot)
	if err != nil {
		return ArchiveCycleSnapshot{}, err
	}
	if archive.ArchivePayloadSHA256 != "" && archive.ArchivePayloadSHA256 != payloadSHA256 {
		return ArchiveCycleSnapshot{}, ErrArchivePayloadMismatch
	}

	return snapshot, nil
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

	storedArchive, err := s.ipfs.StoreJSON(ctx, archiveSeed.ArchiveID, snapshot)
	if err != nil {
		return ArchiveSummary{}, fmt.Errorf("store archive json on ipfs: %w", err)
	}

	archive := ArchiveSummary{
		ID:                   archiveSeed.ArchiveID,
		GroupID:              groupID,
		CycleID:              cycleID,
		CycleName:            cycle.Name,
		Status:               StatusArchived,
		ArchiveCID:           storedArchive.CID,
		ArchiveHTTPURL:       storedArchive.GatewayURL,
		ArchiveProvider:      "ipfs",
		ArchiveMode:          "kubo-http",
		ArchivePayloadSHA256: archivePayloadSHA256,
		ClosedAt:             archiveSeed.ClosedAt,
	}

	if err := s.store.ArchiveAndDeleteCycle(ctx, archive); err != nil {
		return ArchiveSummary{}, err
	}

	return archive, nil
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

func archivePayloadSHA256(snapshot ArchiveCycleSnapshot) (string, error) {
	rawSnapshot, err := json.Marshal(snapshot)
	if err != nil {
		return "", err
	}

	hash := sha256.Sum256(rawSnapshot)
	return hex.EncodeToString(hash[:]), nil
}

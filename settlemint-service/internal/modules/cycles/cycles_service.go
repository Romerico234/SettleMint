package cycles

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"

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
	ErrCycleAlreadyClosed          = errors.New("settlement cycle is already closed")
	ErrCycleHasOutstandingItems    = errors.New("all settlement obligations must be verified before closing the cycle")
)

type settlementPlanner interface {
	BuildSummary(ctx context.Context, authUser auth.User, groupID string, cycleID string) (settlementPlan.Summary, error)
}

type Service struct {
	store   *Store
	planner settlementPlanner
	ipfs    archiveStorage
}

type archiveStorage interface {
	AddJSON(ctx context.Context, fileName string, payload []byte) (string, error)
	FetchJSON(ctx context.Context, cid string) ([]byte, error)
	GatewayURL(cid string) string
}

func NewService(store *Store, planner settlementPlanner, archiveClient archiveStorage) *Service {
	return &Service{
		store:   store,
		planner: planner,
		ipfs:    archiveClient,
	}
}

func (s *Service) CreateCycle(ctx context.Context, authUser auth.User, groupID string, input CreateCycleRequest) (Cycle, error) {
	input.Name = strings.TrimSpace(input.Name)
	return s.store.CreateCycle(ctx, authUser, strings.TrimSpace(groupID), input)
}

func (s *Service) ListCycles(ctx context.Context, authUser auth.User, groupID string) ([]Cycle, error) {
	return s.store.ListCyclesByGroup(ctx, authUser, strings.TrimSpace(groupID))
}

func (s *Service) ListArchives(ctx context.Context, authUser auth.User) ([]ArchiveSummary, error) {
	return s.store.ListArchivesByWallet(ctx, authUser)
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

	cycle.Status = StatusArchived

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

	rawSnapshot, err := json.Marshal(snapshot)
	if err != nil {
		return ArchiveSummary{}, err
	}

	archivePayloadSHA256 := payloadSHA256(rawSnapshot)
	archiveCID, err := s.ipfs.AddJSON(ctx, archiveSeed.ArchiveID+".json", rawSnapshot)
	if err != nil {
		return ArchiveSummary{}, err
	}

	archive := ArchiveSummary{
		ID:                   archiveSeed.ArchiveID,
		GroupID:              groupID,
		CycleID:              cycleID,
		CycleName:            cycle.Name,
		Status:               StatusArchived,
		ArchiveCID:           archiveCID,
		ArchiveHTTPURL:       s.ipfs.GatewayURL(archiveCID),
		ArchiveProvider:      "ipfs",
		ArchiveMode:          "kubo-http",
		ArchivePayloadSHA256: archivePayloadSHA256,
		ClosedAt:             archiveSeed.ClosedAt,
		ParticipantWallets:   archiveParticipantWallets(archiveSeed.Members),
	}

	if err := s.store.ArchiveAndDeleteCycle(ctx, archive); err != nil {
		return ArchiveSummary{}, err
	}

	return archive, nil
}

func (s *Service) GetArchiveSnapshot(ctx context.Context, authUser auth.User, archiveID string) (ArchiveCycleSnapshot, error) {
	archive, err := s.store.FindArchiveByIDForWallet(ctx, authUser, strings.TrimSpace(archiveID))
	if err != nil {
		return ArchiveCycleSnapshot{}, err
	}

	rawSnapshot, err := s.ipfs.FetchJSON(ctx, archive.ArchiveCID)
	if err != nil {
		return ArchiveCycleSnapshot{}, err
	}

	if payloadSHA256(rawSnapshot) != archive.ArchivePayloadSHA256 {
		return ArchiveCycleSnapshot{}, errors.New("archived cycle payload hash verification failed")
	}

	var snapshot ArchiveCycleSnapshot
	if err := json.Unmarshal(rawSnapshot, &snapshot); err != nil {
		return ArchiveCycleSnapshot{}, err
	}

	return snapshot, nil
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

func payloadSHA256(rawSnapshot []byte) string {
	hash := sha256.Sum256(rawSnapshot)
	return hex.EncodeToString(hash[:])
}

func archiveParticipantWallets(members []ArchiveMember) []string {
	wallets := make([]string, 0, len(members))
	seenWallets := make(map[string]struct{}, len(members))

	for _, member := range members {
		walletAddress := strings.ToLower(strings.TrimSpace(member.WalletAddress))
		if walletAddress == "" {
			continue
		}
		if _, exists := seenWallets[walletAddress]; exists {
			continue
		}

		seenWallets[walletAddress] = struct{}{}
		wallets = append(wallets, walletAddress)
	}

	return wallets
}

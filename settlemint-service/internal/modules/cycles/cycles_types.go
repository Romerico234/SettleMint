package cycles

import (
	"time"

	"settlemint-service/internal/modules/settlement-plan"
)

type Status string

const (
	StatusActive   Status = "Active"
	StatusArchived Status = "Archived"
)

type Cycle struct {
	ID              string    `json:"id" bson:"_id"`
	GroupID         string    `json:"groupId" bson:"group_id"`
	Name            string    `json:"name" bson:"name"`
	Status          Status    `json:"status" bson:"status"`
	CreatedByWallet string    `json:"createdByWallet" bson:"created_by_wallet"`
	CreatedAt       time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt       time.Time `json:"updatedAt" bson:"updated_at"`
}

type CreateCycleRequest struct {
	Name string `json:"name"`
}

type CycleResponse struct {
	Cycle Cycle `json:"cycle"`
}

type CyclesResponse struct {
	Cycles []Cycle `json:"cycles"`
}

type CloseCycleRequest struct {
	ArchiveNotes string `json:"archiveNotes,omitempty"`
}

type ArchiveSummary struct {
	ID                   string    `json:"id" bson:"_id"`
	GroupID              string    `json:"groupId" bson:"group_id"`
	CycleID              string    `json:"cycleId" bson:"cycle_id"`
	CycleName            string    `json:"cycleName" bson:"cycle_name"`
	Status               Status    `json:"status" bson:"status"`
	ArchiveCID           string    `json:"archiveCid" bson:"archive_cid"`
	ArchiveHTTPURL       string    `json:"archiveHttpUrl" bson:"archive_http_url"`
	ArchiveProvider      string    `json:"archiveProvider" bson:"archive_provider"`
	ArchiveMode          string    `json:"archiveMode" bson:"archive_mode"`
	ArchivePayloadSHA256 string    `json:"archivePayloadSha256" bson:"archive_payload_sha256"`
	ClosedAt             time.Time `json:"closedAt" bson:"closed_at"`
}

type ArchiveMember struct {
	WalletAddress string    `json:"walletAddress" bson:"wallet_address"`
	DisplayName   string    `json:"displayName" bson:"display_name"`
	Role          string    `json:"role" bson:"role"`
	JoinedAt      time.Time `json:"joinedAt" bson:"joined_at"`
}

type ArchiveExpenseSplit struct {
	WalletAddress string  `json:"walletAddress" bson:"wallet_address"`
	DisplayName   string  `json:"displayName" bson:"display_name"`
	Amount        float64 `json:"amount" bson:"amount"`
}

type ArchiveExpense struct {
	ID                string                `json:"id" bson:"id"`
	Description       string                `json:"description" bson:"description"`
	Amount            float64               `json:"amount" bson:"amount"`
	PaidByWallet      string                `json:"paidByWallet" bson:"paid_by_wallet"`
	PaidByDisplayName string                `json:"paidByDisplayName" bson:"paid_by_display_name"`
	CreatedByWallet   string                `json:"createdByWallet" bson:"created_by_wallet"`
	CreatedAt         time.Time             `json:"createdAt" bson:"created_at"`
	UpdatedAt         time.Time             `json:"updatedAt" bson:"updated_at"`
	DeletePending     bool                  `json:"deletePending" bson:"delete_pending"`
	Splits            []ArchiveExpenseSplit `json:"splits" bson:"splits"`
}

type ArchiveGroup struct {
	ID          string `json:"id" bson:"id"`
	Name        string `json:"name" bson:"name"`
	OwnerWallet string `json:"ownerWallet" bson:"owner_wallet"`
	InviteCode  string `json:"inviteCode" bson:"invite_code"`
	MemberCount int    `json:"memberCount" bson:"member_count"`
}

type ArchiveCycleSnapshot struct {
	SchemaVersion  string                 `json:"schemaVersion" bson:"schema_version"`
	Group          ArchiveGroup           `json:"group" bson:"group"`
	Cycle          Cycle                  `json:"cycle" bson:"cycle"`
	ClosedByWallet string                 `json:"closedByWallet" bson:"closed_by_wallet"`
	ClosedAt       time.Time              `json:"closedAt" bson:"closed_at"`
	ArchiveNotes   string                 `json:"archiveNotes,omitempty" bson:"archive_notes,omitempty"`
	Members        []ArchiveMember        `json:"members" bson:"members"`
	Expenses       []ArchiveExpense       `json:"expenses" bson:"expenses"`
	Summary        settlementplan.Summary `json:"summary" bson:"summary"`
}

type ArchiveResponse struct {
	Archive ArchiveSummary `json:"archive"`
}

type ArchivesResponse struct {
	Archives []ArchiveSummary `json:"archives"`
}

type ArchiveRecord struct {
	Summary  ArchiveSummary       `json:"summary"`
	Snapshot ArchiveCycleSnapshot `json:"snapshot"`
}

package cycles

import "time"

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

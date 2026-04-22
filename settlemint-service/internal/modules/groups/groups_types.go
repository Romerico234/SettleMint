package groups

import "time"

type Group struct {
	ID              string    `json:"id" bson:"_id"`
	Name            string    `json:"name" bson:"name"`
	OwnerWallet     string    `json:"ownerWallet" bson:"owner_wallet"`
	InviteCode      string    `json:"inviteCode" bson:"invite_code"`
	MemberCount     int       `json:"memberCount" bson:"member_count"`
	CurrentUserRole string    `json:"currentUserRole,omitempty" bson:"-"`
	CreatedAt       time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt       time.Time `json:"updatedAt" bson:"updated_at"`
}

type Membership struct {
	GroupID       string    `json:"groupId" bson:"group_id"`
	WalletAddress string    `json:"walletAddress" bson:"wallet_address"`
	Role          string    `json:"role" bson:"role"`
	CreatedAt     time.Time `json:"createdAt" bson:"created_at"`
}

type CreateGroupRequest struct {
	Name string `json:"name"`
}

type JoinGroupRequest struct {
	InviteCode string `json:"inviteCode"`
}

type GroupIDRequest struct {
	GroupID string `json:"groupId"`
}

type GroupMember struct {
	WalletAddress string `json:"walletAddress"`
	DisplayName   string `json:"displayName"`
	Role          string `json:"role"`
}

type GroupResponse struct {
	Group Group `json:"group"`
}

type GroupsResponse struct {
	Groups []Group `json:"groups"`
}

type GroupMembersResponse struct {
	Members []GroupMember `json:"members"`
}

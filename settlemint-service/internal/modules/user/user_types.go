package user

import "time"

type Profile struct {
	ID            string    `json:"id"`
	DisplayName   string    `json:"displayName"`
	WalletAddress string    `json:"walletAddress"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type UpdateProfileRequest struct {
	DisplayName string `json:"displayName"`
}

type ProfileResponse struct {
	Profile Profile `json:"profile"`
}

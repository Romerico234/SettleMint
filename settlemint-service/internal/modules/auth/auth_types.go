package auth

type MeResponse struct {
	User User `json:"user"`
}

type ChallengeRequest struct {
	WalletAddress string `json:"walletAddress"`
	Domain        string `json:"domain"`
	URI           string `json:"uri"`
	ChainID       int    `json:"chainId"`
}

type ChallengeResponse struct {
	Message   string `json:"message"`
	Nonce     string `json:"nonce"`
	IssuedAt  string `json:"issuedAt"`
	ExpiresAt string `json:"expiresAt"`
}

type VerifyRequest struct {
	WalletAddress string `json:"walletAddress"`
	Message       string `json:"message"`
	Signature     string `json:"signature"`
}

type VerifyResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

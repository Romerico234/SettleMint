package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"settlement-service/internal/core/config"
)

var (
	ErrMissingBearerToken = errors.New("missing bearer token")
	ErrInvalidToken       = errors.New("invalid token")
	ErrMissingConfig      = errors.New("supabase auth is not configured")
	evmWalletPattern      = regexp.MustCompile(`^0x[a-fA-F0-9]{40}$`)
)

type User struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Role          string `json:"role"`
	WalletAddress string `json:"walletAddress"`
}

type rawUser struct {
	ID         string `json:"id"`
	Email      string `json:"email"`
	Role       string `json:"role"`
	Identities []struct {
		Provider     string         `json:"provider"`
		ProviderID   string         `json:"provider_id"`
		IdentityData map[string]any `json:"identity_data"`
	} `json:"identities"`
	UserMetadata map[string]any `json:"user_metadata"`
}

type SupabaseAuth struct {
	baseURL        string
	publishableKey string
	client         *http.Client
}

func NewSupabaseAuth(cfg config.Config) *SupabaseAuth {
	return &SupabaseAuth{
		baseURL:        strings.TrimRight(cfg.SupabaseURL, "/"),
		publishableKey: cfg.SupabasePublishableKey,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (s *SupabaseAuth) IsConfigured() bool {
	return s.baseURL != "" && s.publishableKey != ""
}

func (s *SupabaseAuth) VerifyToken(ctx context.Context, token string) (User, error) {
	if token == "" {
		return User{}, ErrMissingBearerToken
	}

	if !s.IsConfigured() {
		return User{}, ErrMissingConfig
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+"/auth/v1/user", nil)
	if err != nil {
		return User{}, fmt.Errorf("create auth request: %w", err)
	}

	req.Header.Set("apikey", s.publishableKey)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := s.client.Do(req)
	if err != nil {
		return User{}, fmt.Errorf("verify token with supabase: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return User{}, ErrInvalidToken
	}

	var decoded rawUser
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return User{}, fmt.Errorf("decode supabase user: %w", err)
	}

	walletAddress := extractWalletAddress(decoded)
	if walletAddress == "" {
		walletAddress = extractWalletAddressFromToken(token)
	}
	if walletAddress == "" {
		log.Printf(
			"warning: could not derive wallet address from supabase user payload: user_id=%s providers=%v user_metadata_keys=%v",
			decoded.ID,
			identityProviders(decoded),
			mapKeys(decoded.UserMetadata),
		)
	}

	return User{
		ID:            decoded.ID,
		Email:         decoded.Email,
		Role:          decoded.Role,
		WalletAddress: walletAddress,
	}, nil
}

func extractWalletAddress(user rawUser) string {
	identityCandidates := []string{"address", "wallet_address", "sub"}

	for _, identity := range user.Identities {
		if evmWalletPattern.MatchString(strings.TrimSpace(identity.ProviderID)) {
			return strings.ToLower(strings.TrimSpace(identity.ProviderID))
		}

		for _, key := range identityCandidates {
			value := strings.TrimSpace(fmt.Sprint(identity.IdentityData[key]))
			if evmWalletPattern.MatchString(value) {
				return strings.ToLower(value)
			}
		}
	}

	metadataCandidates := []string{"wallet_address", "address"}
	for _, key := range metadataCandidates {
		value := strings.TrimSpace(fmt.Sprint(user.UserMetadata[key]))
		if evmWalletPattern.MatchString(value) {
			return strings.ToLower(value)
		}
	}

	if value := findWalletAddressInValue(user.UserMetadata); value != "" {
		return value
	}

	return ""
}

func extractWalletAddressFromToken(token string) string {
	parts := strings.Split(token, ".")
	if len(parts) < 2 {
		return ""
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return ""
	}

	var claims map[string]any
	if err := json.Unmarshal(payload, &claims); err != nil {
		return ""
	}

	return findWalletAddressInValue(claims)
}

func findWalletAddressInValue(value any) string {
	switch typed := value.(type) {
	case map[string]any:
		priorityKeys := []string{"wallet_address", "address", "provider_id"}
		for _, key := range priorityKeys {
			if raw, ok := typed[key]; ok {
				if address := normalizeWalletAddress(raw); address != "" {
					return address
				}
			}
		}

		for _, raw := range typed {
			if address := findWalletAddressInValue(raw); address != "" {
				return address
			}
		}
	case []any:
		for _, raw := range typed {
			if address := findWalletAddressInValue(raw); address != "" {
				return address
			}
		}
	default:
		return normalizeWalletAddress(typed)
	}

	return ""
}

func normalizeWalletAddress(value any) string {
	address := strings.TrimSpace(fmt.Sprint(value))
	if evmWalletPattern.MatchString(address) {
		return strings.ToLower(address)
	}

	return ""
}

func identityProviders(user rawUser) []string {
	providers := make([]string, 0, len(user.Identities))
	for _, identity := range user.Identities {
		providers = append(providers, identity.Provider)
	}
	return providers
}

func mapKeys(input map[string]any) []string {
	keys := make([]string, 0, len(input))
	for key := range input {
		keys = append(keys, key)
	}
	return keys
}

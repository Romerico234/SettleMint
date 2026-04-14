package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"settlemint-service/internal/core/config"

	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

var (
	ErrMissingBearerToken = errors.New("missing bearer token")
	ErrInvalidToken       = errors.New("invalid token")
	ErrMissingConfig      = errors.New("wallet auth is not configured")
	ErrInvalidChallenge   = errors.New("invalid wallet challenge")
	evmWalletPattern      = regexp.MustCompile(`^0x[a-fA-F0-9]{40}$`)
)

const challengeStatement = "Sign in to SettleMint with your wallet."

type User struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Role          string `json:"role"`
	WalletAddress string `json:"walletAddress"`
}

type challengeDocument struct {
	Nonce         string    `bson:"nonce"`
	WalletAddress string    `bson:"wallet_address"`
	Domain        string    `bson:"domain"`
	URI           string    `bson:"uri"`
	ChainID       int       `bson:"chain_id"`
	IssuedAt      time.Time `bson:"issued_at"`
	ExpiresAt     time.Time `bson:"expires_at"`
}

type signedTokenPayload struct {
	Sub           string `json:"sub"`
	Role          string `json:"role"`
	WalletAddress string `json:"walletAddress"`
	Exp           int64  `json:"exp"`
}

type WalletAuth struct {
	secret           []byte
	nonceCollection  *mongo.Collection
	challengeTimeout time.Duration
	tokenTTL         time.Duration
}

func NewWalletAuth(cfg config.Config, database *mongo.Database) *WalletAuth {
	return &WalletAuth{
		secret:           []byte(cfg.AuthTokenSecret),
		nonceCollection:  database.Collection("auth_nonces"),
		challengeTimeout: 5 * time.Minute,
		tokenTTL:         24 * time.Hour,
	}
}

func (s *WalletAuth) IsConfigured() bool {
	return len(s.secret) > 0 && s.nonceCollection != nil
}

func (s *WalletAuth) CreateChallenge(ctx context.Context, input ChallengeRequest) (ChallengeResponse, error) {
	if !s.IsConfigured() {
		return ChallengeResponse{}, ErrMissingConfig
	}

	walletAddress := normalizeWalletAddress(input.WalletAddress)
	if walletAddress == "" {
		return ChallengeResponse{}, errors.New("walletAddress must be a valid EVM address")
	}
	if strings.TrimSpace(input.Domain) == "" {
		return ChallengeResponse{}, errors.New("domain is required")
	}
	if strings.TrimSpace(input.URI) == "" {
		return ChallengeResponse{}, errors.New("uri is required")
	}
	if input.ChainID < 1 {
		return ChallengeResponse{}, errors.New("chainId must be greater than 0")
	}

	now := time.Now().UTC().Truncate(time.Second)
	nonce, err := generateNonce(16)
	if err != nil {
		return ChallengeResponse{}, fmt.Errorf("generate nonce: %w", err)
	}

	document := challengeDocument{
		Nonce:         nonce,
		WalletAddress: walletAddress,
		Domain:        strings.TrimSpace(input.Domain),
		URI:           strings.TrimSpace(input.URI),
		ChainID:       input.ChainID,
		IssuedAt:      now,
		ExpiresAt:     now.Add(s.challengeTimeout),
	}

	if _, err := s.nonceCollection.InsertOne(ctx, document); err != nil {
		return ChallengeResponse{}, fmt.Errorf("persist auth challenge: %w", err)
	}

	return ChallengeResponse{
		Message:   formatChallengeMessage(document),
		Nonce:     document.Nonce,
		IssuedAt:  document.IssuedAt.Format(time.RFC3339),
		ExpiresAt: document.ExpiresAt.Format(time.RFC3339),
	}, nil
}

func (s *WalletAuth) VerifyWallet(ctx context.Context, input VerifyRequest) (VerifyResponse, error) {
	if !s.IsConfigured() {
		return VerifyResponse{}, ErrMissingConfig
	}

	walletAddress := normalizeWalletAddress(input.WalletAddress)
	if walletAddress == "" {
		return VerifyResponse{}, ErrInvalidChallenge
	}

	challenge, err := parseChallengeMessage(input.Message)
	if err != nil {
		return VerifyResponse{}, ErrInvalidChallenge
	}
	if challenge.WalletAddress != walletAddress {
		return VerifyResponse{}, ErrInvalidChallenge
	}

	var stored challengeDocument
	if err := s.nonceCollection.FindOne(ctx, bson.M{"nonce": challenge.Nonce}).Decode(&stored); err != nil {
		return VerifyResponse{}, ErrInvalidChallenge
	}
	if time.Now().UTC().After(stored.ExpiresAt) {
		_, _ = s.nonceCollection.DeleteOne(ctx, bson.M{"nonce": stored.Nonce})
		return VerifyResponse{}, ErrInvalidChallenge
	}
	if formatChallengeMessage(stored) != strings.TrimSpace(input.Message) {
		return VerifyResponse{}, ErrInvalidChallenge
	}

	recoveredAddress, err := recoverWalletAddress(input.Message, input.Signature)
	if err != nil || recoveredAddress != walletAddress {
		return VerifyResponse{}, ErrInvalidChallenge
	}

	_, _ = s.nonceCollection.DeleteOne(ctx, bson.M{"nonce": stored.Nonce})

	user := User{
		ID:            walletAddress,
		Role:          "member",
		WalletAddress: walletAddress,
	}

	token, err := s.signToken(user)
	if err != nil {
		return VerifyResponse{}, fmt.Errorf("sign token: %w", err)
	}

	return VerifyResponse{
		Token: token,
		User:  user,
	}, nil
}

func (s *WalletAuth) VerifyToken(_ context.Context, token string) (User, error) {
	if token == "" {
		return User{}, ErrMissingBearerToken
	}
	if !s.IsConfigured() {
		return User{}, ErrMissingConfig
	}

	payload, err := s.parseToken(token)
	if err != nil {
		return User{}, ErrInvalidToken
	}

	return User{
		ID:            payload.Sub,
		Role:          payload.Role,
		WalletAddress: payload.WalletAddress,
	}, nil
}

func (s *WalletAuth) signToken(user User) (string, error) {
	payload := signedTokenPayload{
		Sub:           user.ID,
		Role:          user.Role,
		WalletAddress: user.WalletAddress,
		Exp:           time.Now().UTC().Add(s.tokenTTL).Unix(),
	}

	encodedPayload, err := encodeTokenPart(payload)
	if err != nil {
		return "", err
	}

	mac := hmac.New(sha256.New, s.secret)
	_, _ = mac.Write([]byte(encodedPayload))
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return encodedPayload + "." + signature, nil
}

func (s *WalletAuth) parseToken(token string) (signedTokenPayload, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return signedTokenPayload{}, ErrInvalidToken
	}

	mac := hmac.New(sha256.New, s.secret)
	_, _ = mac.Write([]byte(parts[0]))
	expectedSignature := mac.Sum(nil)

	signature, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil || !hmac.Equal(signature, expectedSignature) {
		return signedTokenPayload{}, ErrInvalidToken
	}

	var payload signedTokenPayload
	if err := decodeTokenPart(parts[0], &payload); err != nil {
		return signedTokenPayload{}, ErrInvalidToken
	}
	if payload.Exp <= time.Now().UTC().Unix() {
		return signedTokenPayload{}, ErrInvalidToken
	}
	if normalizeWalletAddress(payload.WalletAddress) == "" || payload.Sub == "" {
		return signedTokenPayload{}, ErrInvalidToken
	}

	return payload, nil
}

func formatChallengeMessage(challenge challengeDocument) string {
	return fmt.Sprintf(`%s wants you to sign in with your Ethereum account:
%s

%s

URI: %s
Version: 1
Chain ID: %d
Nonce: %s
Issued At: %s
Expiration Time: %s`,
		challenge.Domain,
		challenge.WalletAddress,
		challengeStatement,
		challenge.URI,
		challenge.ChainID,
		challenge.Nonce,
		challenge.IssuedAt.Format(time.RFC3339),
		challenge.ExpiresAt.Format(time.RFC3339),
	)
}

func parseChallengeMessage(message string) (challengeDocument, error) {
	lines := strings.Split(strings.TrimSpace(message), "\n")
	if len(lines) < 10 {
		return challengeDocument{}, ErrInvalidChallenge
	}

	domain := strings.TrimSuffix(lines[0], " wants you to sign in with your Ethereum account:")
	walletAddress := normalizeWalletAddress(lines[1])
	if walletAddress == "" {
		return challengeDocument{}, ErrInvalidChallenge
	}

	values := map[string]string{}
	for _, line := range lines[5:] {
		parts := strings.SplitN(line, ": ", 2)
		if len(parts) == 2 {
			values[parts[0]] = parts[1]
		}
	}

	chainID, err := strconv.Atoi(values["Chain ID"])
	if err != nil {
		return challengeDocument{}, ErrInvalidChallenge
	}
	issuedAt, err := time.Parse(time.RFC3339, values["Issued At"])
	if err != nil {
		return challengeDocument{}, ErrInvalidChallenge
	}
	expiresAt, err := time.Parse(time.RFC3339, values["Expiration Time"])
	if err != nil {
		return challengeDocument{}, ErrInvalidChallenge
	}

	return challengeDocument{
		Domain:        domain,
		WalletAddress: walletAddress,
		URI:           values["URI"],
		ChainID:       chainID,
		Nonce:         values["Nonce"],
		IssuedAt:      issuedAt,
		ExpiresAt:     expiresAt,
	}, nil
}

func recoverWalletAddress(message string, signature string) (string, error) {
	signatureBytes, err := hexutil.Decode(signature)
	if err != nil {
		return "", err
	}
	if len(signatureBytes) != crypto.SignatureLength {
		return "", ErrInvalidChallenge
	}
	if signatureBytes[64] >= 27 {
		signatureBytes[64] -= 27
	}

	messageHash := crypto.Keccak256Hash([]byte(fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)))
	publicKey, err := crypto.SigToPub(messageHash.Bytes(), signatureBytes)
	if err != nil {
		return "", err
	}

	return strings.ToLower(crypto.PubkeyToAddress(*publicKey).Hex()), nil
}

func normalizeWalletAddress(value any) string {
	address := strings.TrimSpace(fmt.Sprint(value))
	if evmWalletPattern.MatchString(address) {
		return strings.ToLower(address)
	}
	return ""
}

func generateNonce(numBytes int) (string, error) {
	buffer := make([]byte, numBytes)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}

func encodeTokenPart(value any) (string, error) {
	encoded, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(encoded), nil
}

func decodeTokenPart(input string, dest any) error {
	decoded, err := base64.RawURLEncoding.DecodeString(input)
	if err != nil {
		return err
	}
	return json.Unmarshal(decoded, dest)
}

package config

import (
	"fmt"
	"os"
	"strings"
)

type Environment string

const (
	EnvironmentDevelopment Environment = "development"
	EnvironmentProduction  Environment = "production"
)

type Config struct {
	AppEnv                 Environment
	Port                   string
	MongoURI               string
	MongoDatabase          string
	AuthTokenSecret        string
	CORSAllowedOrigin      string
	IPFSAPIURL             string
	IPFSGatewayURL         string
	SettlementNetwork      string
	SettlementRPCURL       string
	SettlementChainID      int64
	SettlementProofAddress string
}

func Load() Config {
	appEnv := loadEnvironment()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	corsAllowedOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
	if corsAllowedOrigin == "" && appEnv == EnvironmentDevelopment {
		corsAllowedOrigin = "http://localhost:5173"
	}

	return Config{
		AppEnv:                 appEnv,
		Port:                   port,
		MongoURI:               loadMongoURI(appEnv),
		MongoDatabase:          loadMongoDatabase(appEnv),
		AuthTokenSecret:        loadAuthTokenSecret(appEnv),
		CORSAllowedOrigin:      corsAllowedOrigin,
		IPFSAPIURL:             loadIPFSAPIURL(),
		IPFSGatewayURL:         loadIPFSGatewayURL(),
		SettlementNetwork:      loadSettlementNetwork(),
		SettlementRPCURL:       loadSettlementRPCURL(),
		SettlementChainID:      loadSettlementChainID(),
		SettlementProofAddress: loadSettlementProofAddress(),
	}
}

func (c Config) Validate() error {
	if c.AppEnv != EnvironmentDevelopment && c.AppEnv != EnvironmentProduction {
		return fmt.Errorf("APP_ENV must be %q or %q", EnvironmentDevelopment, EnvironmentProduction)
	}

	if c.MongoURI == "" {
		return fmt.Errorf("MONGODB_URI is required")
	}

	if c.MongoDatabase == "" {
		return fmt.Errorf("MONGODB_DATABASE is required")
	}

	if c.AuthTokenSecret == "" {
		return fmt.Errorf("AUTH_TOKEN_SECRET is required")
	}

	if c.AppEnv == EnvironmentProduction && c.CORSAllowedOrigin == "" {
		return fmt.Errorf("CORS_ALLOWED_ORIGIN is required in production")
	}

	if c.SettlementChainID <= 0 {
		return fmt.Errorf("SETTLEMENT_CHAIN_ID must be greater than 0")
	}

	if c.IPFSAPIURL == "" {
		return fmt.Errorf("IPFS_API_URL is required")
	}

	if c.IPFSGatewayURL == "" {
		return fmt.Errorf("IPFS_GATEWAY_URL is required")
	}

	if c.SettlementProofAddress == "" {
		return fmt.Errorf("SETTLEMENT_PROOF_ADDRESS is required")
	}

	return nil
}

func (c Config) IsDevelopment() bool {
	return c.AppEnv == EnvironmentDevelopment
}

func (c Config) IsProduction() bool {
	return c.AppEnv == EnvironmentProduction
}

func loadEnvironment() Environment {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv("APP_ENV")))
	if raw == "" {
		return EnvironmentDevelopment
	}

	return Environment(raw)
}

func loadMongoURI(appEnv Environment) string {
	value := strings.TrimSpace(os.Getenv("MONGODB_URI"))
	if value != "" {
		return value
	}

	if appEnv == EnvironmentDevelopment {
		return "mongodb://localhost:27017"
	}

	return ""
}

func loadMongoDatabase(appEnv Environment) string {
	value := strings.TrimSpace(os.Getenv("MONGODB_DATABASE"))
	if value != "" {
		return value
	}

	if appEnv == EnvironmentDevelopment {
		return "settlemint_db_dev"
	}

	return ""
}

func loadAuthTokenSecret(appEnv Environment) string {
	value := strings.TrimSpace(os.Getenv("AUTH_TOKEN_SECRET"))
	if value != "" {
		return value
	}

	if appEnv == EnvironmentDevelopment {
		return "settlemint-dev-secret-change-me"
	}

	return ""
}

func loadSettlementNetwork() string {
	value := strings.TrimSpace(os.Getenv("SETTLEMENT_NETWORK"))
	if value != "" {
		return value
	}

	return "localhost"
}

func loadIPFSAPIURL() string {
	return strings.TrimSpace(os.Getenv("IPFS_API_URL"))
}

func loadIPFSGatewayURL() string {
	return strings.TrimSpace(os.Getenv("IPFS_GATEWAY_URL"))
}

func loadSettlementRPCURL() string {
	value := strings.TrimSpace(os.Getenv("SETTLEMENT_RPC_URL"))
	if value != "" {
		return value
	}

	return "http://127.0.0.1:8545"
}

func loadSettlementChainID() int64 {
	value := strings.TrimSpace(os.Getenv("SETTLEMENT_CHAIN_ID"))
	if value == "" {
		return 31337
	}

	var chainID int64
	if _, err := fmt.Sscanf(value, "%d", &chainID); err != nil {
		return 0
	}

	return chainID
}

func loadSettlementProofAddress() string {
	value := strings.TrimSpace(os.Getenv("SETTLEMENT_PROOF_ADDRESS"))
	if value != "" {
		return strings.ToLower(value)
	}

	return "0x5fbdb2315678afecb367f032d93f642f64180aa3"
}

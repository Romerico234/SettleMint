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
	AppEnv            Environment
	Port              string
	MongoURI          string
	MongoDatabase     string
	AuthTokenSecret   string
	CORSAllowedOrigin string
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
		AppEnv:            appEnv,
		Port:              port,
		MongoURI:          loadMongoURI(appEnv),
		MongoDatabase:     loadMongoDatabase(appEnv),
		AuthTokenSecret:   loadAuthTokenSecret(appEnv),
		CORSAllowedOrigin: corsAllowedOrigin,
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
		return "settlemint_dev"
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

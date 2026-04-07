package config

import (
	"fmt"
	"os"
	"strconv"
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
	DatabaseURL            string
	DatabaseMinConns       int32
	DatabaseMaxConns       int32
	SupabaseURL            string
	SupabasePublishableKey string
	CORSAllowedOrigin      string
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
		DatabaseURL:            os.Getenv("DATABASE_URL"),
		DatabaseMinConns:       loadInt32Env("DB_MIN_CONNS", 1),
		DatabaseMaxConns:       loadInt32Env("DB_MAX_CONNS", 5),
		SupabaseURL:            os.Getenv("SUPABASE_URL"),
		SupabasePublishableKey: os.Getenv("SUPABASE_PUBLISHABLE_KEY"),
		CORSAllowedOrigin:      corsAllowedOrigin,
	}
}

func (c Config) Validate() error {
	if c.AppEnv != EnvironmentDevelopment && c.AppEnv != EnvironmentProduction {
		return fmt.Errorf("APP_ENV must be %q or %q", EnvironmentDevelopment, EnvironmentProduction)
	}

	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}

	if c.DatabaseMinConns < 1 {
		return fmt.Errorf("DB_MIN_CONNS must be at least 1")
	}

	if c.DatabaseMaxConns < c.DatabaseMinConns {
		return fmt.Errorf("DB_MAX_CONNS must be greater than or equal to DB_MIN_CONNS")
	}

	if c.AppEnv == EnvironmentProduction {
		if c.CORSAllowedOrigin == "" {
			return fmt.Errorf("CORS_ALLOWED_ORIGIN is required in production")
		}
		if c.SupabaseURL == "" {
			return fmt.Errorf("SUPABASE_URL is required in production")
		}
		if c.SupabasePublishableKey == "" {
			return fmt.Errorf("SUPABASE_PUBLISHABLE_KEY is required in production")
		}
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

func loadInt32Env(key string, fallback int32) int32 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseInt(value, 10, 32)
	if err != nil {
		return fallback
	}

	return int32(parsed)
}

package config

import "os"

type Config struct {
	Port                   string
	DatabaseURL            string
	SupabaseURL            string
	SupabasePublishableKey string
	CORSAllowedOrigin      string
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	corsAllowedOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
	if corsAllowedOrigin == "" {
		corsAllowedOrigin = "http://localhost:5173"
	}

	return Config{
		Port:                   port,
		DatabaseURL:            os.Getenv("DATABASE_URL"),
		SupabaseURL:            os.Getenv("SUPABASE_URL"),
		SupabasePublishableKey: os.Getenv("SUPABASE_PUBLISHABLE_KEY"),
		CORSAllowedOrigin:      corsAllowedOrigin,
	}
}

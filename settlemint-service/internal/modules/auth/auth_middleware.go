package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"settlement-service/internal/core/server"
)

type contextKey string

const userContextKey contextKey = "authenticated-user"

type TokenVerifier interface {
	VerifyToken(ctx context.Context, token string) (User, error)
}

func Middleware(verifier TokenVerifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, err := bearerTokenFromHeader(r.Header.Get("Authorization"))
			if err != nil {
				server.WriteError(w, http.StatusUnauthorized, err.Error())
				return
			}

			user, err := verifier.VerifyToken(r.Context(), token)
			if err != nil {
				status := http.StatusUnauthorized
				if errors.Is(err, ErrMissingConfig) {
					status = http.StatusInternalServerError
				}

				server.WriteError(w, status, err.Error())
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func UserFromContext(ctx context.Context) (User, bool) {
	user, ok := ctx.Value(userContextKey).(User)
	return user, ok
}

func bearerTokenFromHeader(header string) (string, error) {
	if header == "" {
		return "", ErrMissingBearerToken
	}

	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
		return "", ErrMissingBearerToken
	}

	return parts[1], nil
}

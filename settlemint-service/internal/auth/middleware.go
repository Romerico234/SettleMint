package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"settlement-service/internal/httpx"
)

type contextKey string

const userContextKey contextKey = "authenticated-user"

func Middleware(authClient *SupabaseAuth) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, err := bearerTokenFromHeader(r.Header.Get("Authorization"))
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, err.Error())
				return
			}

			user, err := authClient.VerifyToken(r.Context(), token)
			if err != nil {
				status := http.StatusUnauthorized
				if errors.Is(err, ErrMissingConfig) {
					status = http.StatusInternalServerError
				}

				httpx.WriteError(w, status, err.Error())
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

package user

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"settlement-service/internal/auth"
	"settlement-service/internal/httpx"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	profile, err := h.service.EnsureCurrentProfile(r.Context(), authUser)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	log.Printf(
		"user profile ensured: user_id=%s wallet_address=%s display_name=%q",
		profile.ID,
		profile.WalletAddress,
		profile.DisplayName,
	)

	httpx.WriteJSON(w, http.StatusOK, ProfileResponse{Profile: profile})
}

func (h *Handler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	var input UpdateProfileRequest
	if err := httpx.DecodeJSON(r, &input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := validateUpsertInput(input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	profile, err := h.service.UpdateCurrentProfile(r.Context(), authUser, input)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	log.Printf(
		"user profile updated: user_id=%s wallet_address=%s display_name=%q",
		profile.ID,
		profile.WalletAddress,
		profile.DisplayName,
	)

	httpx.WriteJSON(w, http.StatusOK, ProfileResponse{Profile: profile})
}

func validateUpsertInput(input UpdateProfileRequest) error {
	displayName := strings.TrimSpace(input.DisplayName)

	if len(displayName) > 80 {
		return errors.New("display name must be 80 characters or fewer")
	}

	return nil
}

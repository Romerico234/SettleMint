package groups

import (
	"errors"
	"net/http"
	"strings"

	"settlemint-service/internal/core/server"
	"settlemint-service/internal/modules/auth"

	"github.com/go-chi/chi/v5"
)

type Module struct {
	middleware func(http.Handler) http.Handler
	service    *Service
}

func NewModule(store *Store, verifier auth.TokenVerifier) Module {
	return Module{
		middleware: auth.Middleware(verifier),
		service:    NewService(store),
	}
}

func (m Module) RegisterRoutes(r chi.Router) {
	r.Route("/groups", func(r chi.Router) {
		r.Use(m.middleware)
		r.Post("/", m.CreateGroup)
		r.Post("/join", m.JoinGroup)
		r.Get("/", m.ListMyGroups)
		r.Delete("/{groupID}", m.DeleteGroup)
		r.Post("/{groupID}/leave", m.LeaveGroup)
	})
}

func (m Module) CreateGroup(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	var input CreateGroupRequest
	if err := server.DecodeJSON(r, &input); err != nil {
		server.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validateCreateGroupInput(input); err != nil {
		server.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	group, err := m.service.CreateGroup(r.Context(), authUser, input)
	if err != nil {
		if errors.Is(err, ErrGroupMembershipLimit) {
			server.WriteError(w, http.StatusConflict, err.Error())
			return
		}
		server.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	server.WriteJSON(w, http.StatusCreated, GroupResponse{Group: group})
}

func (m Module) ListMyGroups(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	groups, err := m.service.ListMyGroups(r.Context(), authUser)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	server.WriteJSON(w, http.StatusOK, GroupsResponse{Groups: groups})
}

func (m Module) JoinGroup(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	var input JoinGroupRequest
	if err := server.DecodeJSON(r, &input); err != nil {
		server.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validateJoinGroupInput(input); err != nil {
		server.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	group, err := m.service.JoinGroup(r.Context(), authUser, input)
	if err != nil {
		switch {
		case errors.Is(err, ErrGroupInviteNotFound):
			server.WriteError(w, http.StatusNotFound, err.Error())
			return
		case errors.Is(err, ErrGroupMembershipLimit):
			server.WriteError(w, http.StatusConflict, err.Error())
			return
		}
		server.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	server.WriteJSON(w, http.StatusOK, GroupResponse{Group: group})
}

func (m Module) LeaveGroup(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	groupID := strings.TrimSpace(chi.URLParam(r, "groupID"))
	if groupID == "" {
		server.WriteError(w, http.StatusBadRequest, "group ID is required")
		return
	}

	if err := m.service.LeaveGroup(r.Context(), authUser, groupID); err != nil {
		switch {
		case errors.Is(err, ErrGroupMembershipRequired):
			server.WriteError(w, http.StatusNotFound, err.Error())
			return
		case errors.Is(err, ErrOwnerCannotLeaveGroup):
			server.WriteError(w, http.StatusConflict, err.Error())
			return
		}
		server.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	server.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (m Module) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	authUser, ok := auth.UserFromContext(r.Context())
	if !ok {
		server.WriteError(w, http.StatusUnauthorized, "missing authenticated user")
		return
	}

	groupID := strings.TrimSpace(chi.URLParam(r, "groupID"))
	if groupID == "" {
		server.WriteError(w, http.StatusBadRequest, "group ID is required")
		return
	}

	if err := m.service.DeleteGroup(r.Context(), authUser, groupID); err != nil {
		switch {
		case errors.Is(err, ErrGroupMembershipRequired), errors.Is(err, ErrGroupNotFound):
			server.WriteError(w, http.StatusNotFound, err.Error())
			return
		case errors.Is(err, ErrOnlyOwnerCanDeleteGroup), errors.Is(err, ErrGroupHasOtherMembers):
			server.WriteError(w, http.StatusConflict, err.Error())
			return
		}
		server.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	server.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func validateCreateGroupInput(input CreateGroupRequest) error {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return errors.New("group name is required")
	}
	if len(name) > 80 {
		return errors.New("group name must be 80 characters or fewer")
	}
	return nil
}

func validateJoinGroupInput(input JoinGroupRequest) error {
	inviteCode := strings.TrimSpace(input.InviteCode)
	if inviteCode == "" {
		return errors.New("invite code is required")
	}
	if len(inviteCode) > 80 {
		return errors.New("invite code must be 80 characters or fewer")
	}
	return nil
}

package admin

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/Wei-Shaw/sub2api/internal/identityadmin"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type identityPermissionInput struct {
	Role                 string  `json:"role"`
	Status               string  `json:"status"`
	UserGroupID          *int64  `json:"userGroupId"`
	AllowedGroups        []int64 `json:"allowedGroups"`
	ObserverGroupIDs     []int64 `json:"observerGroupIds"`
	RestrictPublicGroups *bool   `json:"restrictPublicGroups"`
	Concurrency          *int    `json:"concurrency"`
	RPMLimit             *int    `json:"rpmLimit"`
	Revision             string  `json:"revision"`
	Reason               string  `json:"reason"`
}

func identityPermissionError(c *gin.Context, code string, status int) {
	response.ErrorWithDetails(c, status, code, code, nil)
}

// The parent groups already enforce the exact identity-owner allowlist and
// step-up for every write. Resolve never links accounts by matching emails.
// Business changes go through the existing admin service, preserving last-admin
// protection and the API-key authentication cache invalidation path.
func (h *UserHandler) RegisterIdentityPermissions(read, write *gin.RouterGroup, directory *identityadmin.Client, issuer string, resolve func(context.Context, string) (*service.User, error)) {
	requireAdmin := func(c *gin.Context) {
		if role, _ := middleware.GetUserRoleFromContext(c); role != service.RoleAdmin {
			identityPermissionError(c, "identity_mito_admin_required", http.StatusForbidden)
			c.Abort()
			return
		}
		c.Next()
	}
	read = read.Group("", requireAdmin)
	write = write.Group("", requireAdmin)
	lookup := func(c *gin.Context) (*service.User, bool, bool) {
		if directory == nil {
			identityPermissionError(c, "identity_unavailable", 503)
			return nil, true, false
		}
		account, err := directory.Account(c.Request.Context(), c.Param("id"))
		if err != nil {
			var failure *identityadmin.Error
			if errors.As(err, &failure) {
				identityPermissionError(c, failure.Code, failure.Status)
			} else {
				identityPermissionError(c, "identity_unavailable", 503)
			}
			return nil, true, false
		}
		user, err := resolve(c.Request.Context(), account.ID)
		if err != nil {
			identityPermissionError(c, "identity_unavailable", 503)
			return nil, true, false
		}
		protected := account.Protected
		if user != nil {
			protected = protected || user.ID == getAdminIDFromContext(c) || directory.ProtectsLocalUser(user.ID)
		}
		return user, protected, true
	}
	read.GET("/users/:id/mito", func(c *gin.Context) {
		user, protected, ok := lookup(c)
		if !ok {
			return
		}
		c.Header("Cache-Control", "no-store")
		if user == nil {
			response.Success(c, gin.H{"linked": false, "protected": protected})
			return
		}
		groups, err := h.adminService.GetAllGroupsIncludingInactive(c.Request.Context())
		if err != nil {
			response.ErrorFrom(c, err)
			return
		}
		userGroups, err := h.adminService.ListUserGroups(c.Request.Context())
		if err != nil {
			response.ErrorFrom(c, err)
			return
		}
		groupOptions := make([]gin.H, 0, len(groups))
		for _, group := range groups {
			groupOptions = append(groupOptions, gin.H{"id": group.ID, "name": group.Name, "platform": group.Platform, "status": group.Status, "exclusive": group.IsExclusive, "subscriptionType": group.SubscriptionType})
		}
		userGroupOptions := make([]gin.H, 0, len(userGroups))
		for _, group := range userGroups {
			userGroupOptions = append(userGroupOptions, gin.H{"id": group.ID, "name": group.Name, "code": group.Code, "status": group.Status})
		}
		response.Success(c, gin.H{"linked": true, "protected": protected, "account": user.MitoPermissions(), "groups": groupOptions, "userGroups": userGroupOptions})
	})
	write.POST("/users/:id/mito/link", func(c *gin.Context) {
		var input struct {
			UserID int64  `json:"userId"`
			Email  string `json:"email"`
			Reason string `json:"reason"`
		}
		if !decodeMitoInput(c, &input) || input.UserID <= 0 || strings.TrimSpace(input.Email) == "" || !validMitoReason(input.Reason) {
			identityPermissionError(c, "identity_invalid_mito_permissions", 400)
			return
		}
		linked, protected, ok := lookup(c)
		if !ok {
			return
		}
		if protected || input.UserID == getAdminIDFromContext(c) || directory.ProtectsLocalUser(input.UserID) {
			identityPermissionError(c, "identity_protected_account", 403)
			return
		}
		if linked != nil && linked.ID != input.UserID {
			identityPermissionError(c, "identity_mito_link_unavailable", 409)
			return
		}
		_, err := h.adminService.BindUserAuthIdentity(c.Request.Context(), input.UserID, service.AdminBindAuthIdentityInput{
			ProviderType: "oidc", ProviderKey: issuer, Issuer: &issuer, ProviderSubject: c.Param("id"),
			ConfirmMitoAccountEmail: strings.TrimSpace(input.Email),
		})
		if err != nil {
			switch {
			case errors.Is(err, service.ErrUserNotFound), errors.Is(err, service.ErrMitoLinkUnavailable),
				infraerrors.Reason(err) == "AUTH_IDENTITY_OWNERSHIP_CONFLICT":
				identityPermissionError(c, "identity_mito_link_unavailable", 409)
			default:
				response.ErrorFrom(c, err)
			}
			return
		}
		middleware.SetAuditAction(c, "identity.mito_account.link")
		middleware.SetAuditExtra(c, map[string]any{"target_user_id": input.UserID, "reason_code": strings.TrimSpace(input.Reason)})
		response.Success(c, gin.H{"linked": true})
	})
	write.PUT("/users/:id/mito", func(c *gin.Context) {
		var input identityPermissionInput
		if !decodeMitoInput(c, &input) || !validIdentityPermissions(input) {
			identityPermissionError(c, "identity_invalid_mito_permissions", 400)
			return
		}
		user, protected, ok := lookup(c)
		if !ok {
			return
		}
		if protected {
			identityPermissionError(c, "identity_protected_account", 403)
			return
		}
		if user == nil {
			identityPermissionError(c, "identity_mito_not_linked", 409)
			return
		}
		if user.MitoPermissions().Revision != input.Revision {
			identityPermissionError(c, "identity_permissions_changed", 409)
			return
		}
		if user.Role == service.RoleAdmin && input.Status != "active" {
			identityPermissionError(c, "identity_admin_disable_forbidden", 400)
			return
		}
		if input.Role != service.RoleObserver && len(input.ObserverGroupIDs) > 0 {
			identityPermissionError(c, "identity_invalid_mito_permissions", 400)
			return
		}
		if *input.UserGroupID > 0 {
			group, err := h.adminService.GetUserGroup(c.Request.Context(), *input.UserGroupID)
			if err != nil || group.Status != "active" {
				identityPermissionError(c, "identity_invalid_mito_permissions", 400)
				return
			}
		}
		for _, id := range append(append([]int64{}, input.AllowedGroups...), input.ObserverGroupIDs...) {
			if _, err := h.adminService.GetGroup(c.Request.Context(), id); err != nil {
				identityPermissionError(c, "identity_invalid_mito_permissions", 400)
				return
			}
		}
		updated, err := h.adminService.UpdateUser(c.Request.Context(), user.ID, &service.UpdateUserInput{
			Role: input.Role, Status: input.Status, ExpectedMitoRevision: input.Revision, UserGroupID: input.UserGroupID, AllowedGroups: &input.AllowedGroups,
			ObserverGroupIDs: &input.ObserverGroupIDs, RestrictPublicGroups: input.RestrictPublicGroups,
			Concurrency: input.Concurrency, RPMLimit: input.RPMLimit, ActorAdminID: getAdminIDFromContext(c),
		})
		if err != nil {
			response.ErrorFrom(c, err)
			return
		}
		middleware.SetAuditAction(c, "identity.mito_permissions.update")
		middleware.SetAuditExtra(c, map[string]any{"target_user_id": user.ID, "reason_code": strings.TrimSpace(input.Reason), "result": "updated"})
		response.Success(c, updated.MitoPermissions())
	})
}

func validIdentityPermissions(in identityPermissionInput) bool {
	if in.Role != "admin" && in.Role != "user" && in.Role != "observer" {
		return false
	}
	if in.Status != "active" && in.Status != "disabled" {
		return false
	}
	if in.UserGroupID == nil || in.Concurrency == nil || in.RPMLimit == nil || in.RestrictPublicGroups == nil || in.AllowedGroups == nil || in.ObserverGroupIDs == nil {
		return false
	}
	if *in.UserGroupID < 0 || *in.Concurrency < 0 || *in.Concurrency > 100000 || *in.RPMLimit < 0 || *in.RPMLimit > 1000000 || len(in.Revision) != 64 || !validMitoReason(in.Reason) {
		return false
	}
	if _, err := hex.DecodeString(in.Revision); err != nil {
		return false
	}
	for _, ids := range [][]int64{in.AllowedGroups, in.ObserverGroupIDs} {
		if len(ids) > 1000 {
			return false
		}
		seen := map[int64]bool{}
		for _, id := range ids {
			if id <= 0 || seen[id] {
				return false
			}
			seen[id] = true
		}
	}
	return true
}

func decodeMitoInput(c *gin.Context, input any) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16384)
	dec := json.NewDecoder(c.Request.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(input) == nil && dec.Decode(new(any)) == io.EOF
}

func validMitoReason(reason string) bool {
	n := utf8.RuneCountInString(strings.TrimSpace(reason))
	return n >= 3 && n <= 500
}

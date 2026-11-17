package handler

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	middleware "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

// RegisterIdentityLoginPolicy receives groups already protected by the exact
// identity owner allowlist; writes additionally require the existing step-up.
func (h *AuthHandler) RegisterIdentityLoginPolicy(read, write *gin.RouterGroup) {
	read.GET("/login-policy", h.identityLoginPolicy)
	write.PUT("/login-policy", h.updateIdentityLoginPolicy)
}

func (h *AuthHandler) unifiedIdentitySession(c *gin.Context) bool {
	parts := strings.Fields(c.GetHeader("Authorization"))
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return false
	}
	claims, err := h.authService.ValidateToken(parts[1])
	return err == nil && h.authService.ValidateTokenIdentity(c.Request.Context(), claims) == nil &&
		h.authService.RequireUnifiedIdentity(c.Request.Context(), claims) == nil
}

func (h *AuthHandler) identityLoginPolicy(c *gin.Context) {
	enabled, err := h.settingSvc.MitoOIDCOnly(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, gin.H{"oidc_only": enabled, "unified_session": h.unifiedIdentitySession(c)})
}

func (h *AuthHandler) updateIdentityLoginPolicy(c *gin.Context) {
	var input struct {
		Enabled *bool `json:"oidc_only"`
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1024)
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if decoder.Decode(&input) != nil || input.Enabled == nil || decoder.Decode(new(any)) != io.EOF {
		response.BadRequest(c, "invalid_request")
		return
	}
	if *input.Enabled && !h.unifiedIdentitySession(c) {
		response.ErrorFrom(c, service.ErrIdentityLoginRequired)
		return
	}
	if err := h.settingSvc.SetMitoOIDCOnly(c.Request.Context(), *input.Enabled); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	middleware.SetAuditAction(c, "identity.login_policy.update")
	response.Success(c, gin.H{"oidc_only": *input.Enabled, "unified_session": h.unifiedIdentitySession(c)})
}

// IdentityLoginGuard closes alternative authentication entry points before any
// account mutation. Pending OIDC completion and 2FA still pass through their
// own provider/session checks; token issuance enforces the policy again.
func (h *AuthHandler) IdentityLoginGuard(c *gin.Context) {
	if c.FullPath() == "/api/v1/auth/backchannel-logout" || c.FullPath() == "/api/v1/auth/logout" {
		c.Next()
		return
	}
	enabled, err := h.settingSvc.MitoOIDCOnly(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		c.Abort()
		return
	}
	if enabled {
		path := strings.TrimPrefix(c.FullPath(), "/api/v1/auth")
		allowed := strings.HasPrefix(path, "/oauth/oidc/") || strings.HasPrefix(path, "/oauth/pending/")
		switch path {
		case "/refresh", "/logout", "/login/2fa", "/validate-promo-code", "/validate-invitation-code":
			allowed = true
		}
		if !allowed {
			response.ErrorFrom(c, service.ErrIdentityLoginRequired)
			c.Abort()
			return
		}
	}
	c.Next()
}

func (h *AuthHandler) enforcePendingIdentityPolicy(ctx context.Context, provider, issuer string) error {
	enabled, err := h.settingSvc.MitoOIDCOnly(ctx)
	if err != nil {
		return err
	}
	if enabled && (provider != "oidc" || h.cfg == nil || issuer != strings.TrimSpace(h.cfg.OIDC.IssuerURL)) {
		return service.ErrIdentityLoginRequired
	}
	return nil
}

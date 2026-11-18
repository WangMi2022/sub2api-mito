package service

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"github.com/Wei-Shaw/sub2api/ent/authidentity"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

// This namespaced key is consumed only by instances with identity management
// configured. The official instance sharing the database keeps its own login.
const SettingKeyMitoOIDCOnly = "mito_identity_oidc_only"

var ErrIdentityLoginRequired = infraerrors.Forbidden("identity_login_required", "Use unified identity to sign in")

// MitoOIDCOnly deliberately reads durable state on every authentication check.
// A storage failure must never reopen a disabled login method.
func (s *SettingService) MitoOIDCOnly(ctx context.Context) (bool, error) {
	if s == nil || s.cfg == nil || s.cfg.IdentityAdminFile == "" {
		return false, nil
	}
	if s.settingRepo == nil {
		return false, ErrServiceUnavailable
	}
	raw, err := s.settingRepo.GetValue(ctx, SettingKeyMitoOIDCOnly)
	if errors.Is(err, ErrSettingNotFound) {
		return false, nil
	}
	if err != nil || (raw != "true" && raw != "false") {
		return false, ErrServiceUnavailable
	}
	return raw == "true", nil
}

// SetMitoOIDCOnly is called only through the owner-authorized identity routes.
func (s *SettingService) SetMitoOIDCOnly(ctx context.Context, enabled bool) error {
	if s == nil || s.cfg == nil || s.cfg.IdentityAdminFile == "" || s.settingRepo == nil {
		return ErrServiceUnavailable
	}
	if enabled {
		cfg, err := s.GetOIDCConnectOAuthConfig(ctx)
		if err != nil || !cfg.Enabled || !cfg.UsePKCE || !cfg.ValidateIDToken || !strings.HasPrefix(cfg.IssuerURL, "https://") {
			return ErrServiceUnavailable
		}
	}
	if err := s.settingRepo.Set(ctx, SettingKeyMitoOIDCOnly, strconv.FormatBool(enabled)); err != nil {
		return ErrServiceUnavailable
	}
	if s.onUpdate != nil {
		s.onUpdate()
	}
	return nil
}

// RequireUnifiedIdentity proves that this session belongs to the configured
// provider, rather than merely trusting an email or the browser's login label.
func (s *AuthService) RequireUnifiedIdentity(ctx context.Context, claims *JWTClaims) error {
	if claims == nil || claims.AuthIdentityID <= 0 || claims.UserID <= 0 {
		return ErrIdentityLoginRequired
	}
	if s.cfg == nil || s.entClient == nil || strings.TrimSpace(s.cfg.OIDC.IssuerURL) == "" {
		return ErrServiceUnavailable
	}
	exists, err := s.entClient.AuthIdentity.Query().Where(
		authidentity.IDEQ(claims.AuthIdentityID), authidentity.UserIDEQ(claims.UserID),
		authidentity.ProviderTypeEQ("oidc"), authidentity.ProviderKeyEQ(strings.TrimSpace(s.cfg.OIDC.IssuerURL)),
	).Exist(ctx)
	if err != nil {
		return ErrServiceUnavailable
	}
	if !exists {
		return ErrIdentityLoginRequired
	}
	return nil
}

func (s *AuthService) enforceIdentityLoginPolicy(ctx context.Context, claims *JWTClaims) error {
	if s.cfg != nil && s.cfg.IdentityAdminFile != "" && s.settingService == nil {
		return ErrServiceUnavailable
	}
	enabled, err := s.settingService.MitoOIDCOnly(ctx)
	if err != nil {
		return err
	}
	if enabled {
		return s.RequireUnifiedIdentity(ctx, claims)
	}
	return nil
}

// CheckLocalPasswordChange keeps the original local credential intact while
// unified-only sign-in is enabled. Disabling that policy restores local changes.
func (s *AuthService) CheckLocalPasswordChange(ctx context.Context) error {
	if s == nil {
		return nil
	}
	if s.cfg != nil && s.cfg.IdentityAdminFile != "" && s.settingService == nil {
		return ErrServiceUnavailable
	}
	enabled, err := s.settingService.MitoOIDCOnly(ctx)
	if err != nil {
		return err
	}
	if enabled {
		return infraerrors.Forbidden("identity_password_managed", "Change your password through unified identity")
	}
	return nil
}

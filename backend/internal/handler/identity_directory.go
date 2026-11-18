package handler

import (
	"context"
	"errors"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/identityadmin"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

func (h *AuthHandler) ConfigureIdentityDirectory(directory *identityadmin.Client) {
	if h.cfg == nil || h.cfg.IdentityAdminFile == "" {
		return
	}
	h.authService.SetUnifiedAccessCheck(func(ctx context.Context, issuer, subject string) error {
		if directory == nil {
			return service.ErrServiceUnavailable
		}
		if issuer != strings.TrimSpace(h.cfg.OIDC.IssuerURL) {
			return service.ErrTokenRevoked
		}
		err := directory.CheckSessionAccess(ctx, subject, h.cfg.OIDC.ClientID)
		if err == nil {
			return nil
		}
		var safe *identityadmin.Error
		if errors.As(err, &safe) && safe.Code == "identity_application_denied" {
			return service.ErrTokenRevoked
		}
		return service.ErrServiceUnavailable
	})
}

func (h *AuthHandler) ResolveIdentityAccount(ctx context.Context, subject string) (*service.User, error) {
	return h.authService.ResolveUnifiedIdentityUser(ctx, subject)
}

//go:build unit

package handler

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func TestUnifiedAccessRevocationEnforcedForIssueAccessAndRefresh(t *testing.T) {
	h, client, _ := identityPolicyFixture(t)
	ctx := context.Background()
	h.cfg.IdentityAdminFile = "/private/identity.json"
	stored, err := client.User.Create().SetEmail("admission@example.invalid").SetPasswordHash("hash").SetUserGroupID(7).SetRole(service.RoleUser).SetStatus(service.StatusActive).SetBalance(12.5).Save(ctx)
	require.NoError(t, err)
	_, err = client.AuthIdentity.Create().SetUserID(stored.ID).SetProviderType("oidc").SetProviderKey(h.cfg.OIDC.IssuerURL).SetProviderSubject("exact-subject").Save(ctx)
	require.NoError(t, err)
	u, err := h.userService.GetByID(ctx, stored.ID)
	require.NoError(t, err)
	var denied error
	h.authService.SetUnifiedAccessCheck(func(_ context.Context, issuer, subject string) error {
		require.Equal(t, h.cfg.OIDC.IssuerURL, issuer)
		require.Equal(t, "exact-subject", subject)
		return denied
	})
	pair, err := h.authService.GenerateOAuthTokenPair(ctx, u, "oidc", h.cfg.OIDC.IssuerURL, "exact-subject")
	require.NoError(t, err)
	claims, err := h.authService.ValidateToken(pair.AccessToken)
	require.NoError(t, err)
	require.NoError(t, h.authService.ValidateTokenIdentity(ctx, claims))
	denied = service.ErrTokenRevoked
	require.ErrorIs(t, h.authService.ValidateTokenIdentity(ctx, claims), service.ErrTokenRevoked)
	_, err = h.authService.RefreshTokenPair(ctx, pair.RefreshToken)
	require.ErrorIs(t, err, service.ErrTokenRevoked)
	_, err = h.authService.GenerateOAuthTokenPair(ctx, u, "oidc", h.cfg.OIDC.IssuerURL, "exact-subject")
	require.ErrorIs(t, err, service.ErrTokenRevoked)
	denied = service.ErrServiceUnavailable
	require.ErrorIs(t, h.authService.ValidateTokenIdentity(ctx, claims), service.ErrServiceUnavailable)
	denied = nil
	_, err = client.User.UpdateOneID(stored.ID).ClearUserGroupID().Save(ctx)
	require.NoError(t, err)
	require.ErrorIs(t, h.authService.ValidateTokenIdentity(ctx, claims), service.ErrTokenRevoked)
	_, err = h.authService.GenerateOAuthTokenPair(ctx, u, "oidc", h.cfg.OIDC.IssuerURL, "exact-subject")
	require.ErrorIs(t, err, service.ErrTokenRevoked)
	unchanged, err := client.User.Get(ctx, stored.ID)
	require.NoError(t, err)
	require.Equal(t, 12.5, unchanged.Balance)
}

func TestUnifiedIdentityResolutionRequiresExactConfiguredIssuerAndSubject(t *testing.T) {
	h, client, _ := identityPolicyFixture(t)
	ctx := context.Background()
	h.cfg.IdentityAdminFile = "/private/identity.json"
	stored, err := client.User.Create().SetEmail("binding@example.invalid").SetPasswordHash("hash").Save(ctx)
	require.NoError(t, err)
	_, err = client.AuthIdentity.Create().SetUserID(stored.ID).SetProviderType("oidc").SetProviderKey("https://other.example/realms/business").SetProviderSubject("same-subject").Save(ctx)
	require.NoError(t, err)
	resolved, err := h.ResolveIdentityAccount(ctx, "same-subject")
	require.NoError(t, err)
	require.Nil(t, resolved, "matching subject or email must not link a different issuer")
	_, err = client.AuthIdentity.Create().SetUserID(stored.ID).SetProviderType("oidc").SetProviderKey(h.cfg.OIDC.IssuerURL).SetProviderSubject("same-subject").Save(ctx)
	require.NoError(t, err)
	resolved, err = h.ResolveIdentityAccount(ctx, "same-subject")
	require.NoError(t, err)
	require.Equal(t, stored.ID, resolved.ID)
	resolved, err = h.ResolveIdentityAccount(ctx, "missing-subject")
	require.NoError(t, err)
	require.Nil(t, resolved)
	h.cfg.IdentityAdminFile = ""
	_, err = h.ResolveIdentityAccount(ctx, "same-subject")
	require.ErrorIs(t, err, service.ErrServiceUnavailable)
}

func TestUnifiedAccessMissingDirectoryFailsClosedOnlyWhenConfigured(t *testing.T) {
	h, client, _ := identityPolicyFixture(t)
	ctx := context.Background()
	stored, err := client.User.Create().SetEmail("directory@example.invalid").SetPasswordHash("hash").SetUserGroupID(7).Save(ctx)
	require.NoError(t, err)
	_, err = client.AuthIdentity.Create().SetUserID(stored.ID).SetProviderType("oidc").SetProviderKey(h.cfg.OIDC.IssuerURL).SetProviderSubject("subject").Save(ctx)
	require.NoError(t, err)
	u, err := h.userService.GetByID(ctx, stored.ID)
	require.NoError(t, err)
	h.ConfigureIdentityDirectory(nil)
	_, err = h.authService.GenerateOAuthTokenPair(ctx, u, "oidc", h.cfg.OIDC.IssuerURL, "subject")
	require.NoError(t, err, "unconfigured official instance keeps its authentication behavior")
	h.cfg.IdentityAdminFile = "/private/identity.json"
	h.ConfigureIdentityDirectory(nil)
	_, err = h.authService.GenerateOAuthTokenPair(ctx, u, "oidc", h.cfg.OIDC.IssuerURL, "subject")
	require.ErrorIs(t, err, service.ErrServiceUnavailable)
}

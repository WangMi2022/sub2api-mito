package handler

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/repository"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

type identityPolicyRepo struct {
	oauthPendingFlowSettingRepoStub
	err error
}

func (r *identityPolicyRepo) GetValue(ctx context.Context, key string) (string, error) {
	if r.err != nil {
		return "", r.err
	}
	return r.oauthPendingFlowSettingRepoStub.GetValue(ctx, key)
}

func (r *identityPolicyRepo) Set(_ context.Context, key, value string) error {
	if r.err != nil {
		return r.err
	}
	r.values[key] = value
	return nil
}

func identityPolicyFixture(t *testing.T) (*AuthHandler, *dbent.Client, *identityPolicyRepo) {
	t.Helper()
	cfg := config.OIDCConnectConfig{
		Enabled: true, ClientID: "mito", IssuerURL: "https://identity.example/realms/business",
		AuthorizeURL: "https://identity.example/auth", TokenURL: "https://identity.example/token",
		JWKSURL: "https://identity.example/keys", Scopes: "openid profile email", UsePKCE: true,
		ValidateIDToken: true, AllowedSigningAlgs: "RS256", RedirectURL: "https://mito.example/api/v1/auth/oauth/oidc/callback",
		FrontendRedirectURL: "/auth/oidc/callback",
	}
	h, client := newOIDCOAuthHandlerAndClient(t, false, cfg)
	t.Cleanup(func() { _ = client.Close() })
	repo := &identityPolicyRepo{oauthPendingFlowSettingRepoStub: oauthPendingFlowSettingRepoStub{values: map[string]string{}}}
	h.settingSvc = service.NewSettingService(repo, h.cfg)
	rdb := redis.NewClient(&redis.Options{Addr: miniredis.RunT(t).Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	h.authService = service.NewAuthService(client, &oauthPendingFlowUserRepo{client: client}, nil,
		repository.NewRefreshTokenCache(rdb), h.cfg, h.settingSvc, nil, nil, nil, nil, nil, nil, nil)
	return h, client, repo
}

func policyRequest(h *AuthHandler, method, body, token string) *httptest.ResponseRecorder {
	r := gin.New()
	h.RegisterIdentityLoginPolicy(r.Group("/identity"), r.Group("/identity"))
	w := httptest.NewRecorder()
	req := httptest.NewRequest(method, "/identity/login-policy", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)
	return w
}

func TestIdentityLoginPolicyRejectsLocalSessionsAndPreservesUnifiedUser(t *testing.T) {
	h, client, repo := identityPolicyFixture(t)
	ctx := context.Background()
	stored, err := client.User.Create().SetEmail("policy@example.invalid").SetPasswordHash("hash").
		SetRole(service.RoleAdmin).SetStatus(service.StatusActive).SetBalance(21.5).Save(ctx)
	require.NoError(t, err)
	identity, err := client.AuthIdentity.Create().SetUserID(stored.ID).SetProviderType("oidc").
		SetProviderKey(h.cfg.OIDC.IssuerURL).SetProviderSubject("stable-subject").Save(ctx)
	require.NoError(t, err)
	u, err := h.userService.GetByID(ctx, stored.ID)
	require.NoError(t, err)
	local, err := h.authService.GenerateTokenPair(ctx, u, "")
	require.NoError(t, err)
	unified, err := h.authService.GenerateOAuthTokenPair(ctx, u, "oidc", h.cfg.OIDC.IssuerURL, "stable-subject")
	require.NoError(t, err)
	h.cfg.IdentityAdminFile = "/private/identity.json"
	require.Equal(t, 403, policyRequest(h, "PUT", `{"oidc_only":true}`, local.AccessToken).Code)
	require.Empty(t, repo.values[service.SettingKeyMitoOIDCOnly])
	require.Equal(t, 200, policyRequest(h, "PUT", `{"oidc_only":true}`, unified.AccessToken).Code)
	require.Equal(t, "true", repo.values[service.SettingKeyMitoOIDCOnly])
	localClaims, err := h.authService.ValidateToken(local.AccessToken)
	require.NoError(t, err)
	require.ErrorIs(t, h.authService.ValidateTokenIdentity(ctx, localClaims), service.ErrIdentityLoginRequired)
	_, err = h.authService.RefreshTokenPair(ctx, local.RefreshToken)
	require.ErrorIs(t, err, service.ErrIdentityLoginRequired)
	_, err = h.authService.GenerateToken(ctx, u)
	require.ErrorIs(t, err, service.ErrIdentityLoginRequired)
	_, err = h.authService.GenerateTokenPair(ctx, u, "")
	require.ErrorIs(t, err, service.ErrIdentityLoginRequired)
	_, err = h.authService.GenerateOAuthTokenPair(ctx, u, "github", "github", "other")
	require.ErrorIs(t, err, service.ErrIdentityLoginRequired)
	rotated, err := h.authService.RefreshTokenPair(ctx, unified.RefreshToken)
	require.NoError(t, err)
	claims, err := h.authService.ValidateToken(rotated.AccessToken)
	require.NoError(t, err)
	require.Equal(t, stored.ID, claims.UserID)
	require.Equal(t, identity.ID, claims.AuthIdentityID)
	require.NoError(t, h.authService.ValidateTokenIdentity(ctx, claims))
	unchanged, err := client.User.Get(ctx, stored.ID)
	require.NoError(t, err)
	require.Equal(t, 21.5, unchanged.Balance)

	// A different issuer is never sufficient, even if linked to this same user.
	other, err := client.AuthIdentity.Create().SetUserID(stored.ID).SetProviderType("oidc").SetProviderKey("https://other.example").SetProviderSubject("stable-subject").Save(ctx)
	require.NoError(t, err)
	require.ErrorIs(t, h.authService.ValidateTokenIdentity(ctx, &service.JWTClaims{UserID: stored.ID, AuthIdentityID: other.ID}), service.ErrIdentityLoginRequired)
	// Storage failure fails closed; it does not silently restore local login.
	repo.err = errors.New("storage offline")
	require.ErrorIs(t, h.authService.ValidateTokenIdentity(ctx, claims), service.ErrServiceUnavailable)
	repo.err = nil
	require.Equal(t, 200, policyRequest(h, "PUT", `{"oidc_only":false}`, rotated.AccessToken).Code)
	require.NoError(t, h.authService.ValidateTokenIdentity(ctx, localClaims))
	// The shared official instance ignores the namespaced setting.
	repo.values[service.SettingKeyMitoOIDCOnly] = "true"
	h.cfg.IdentityAdminFile = ""
	require.NoError(t, h.authService.ValidateTokenIdentity(ctx, localClaims))
}

func TestIdentityLoginPolicyEntryPointsAndStrictInput(t *testing.T) {
	h, _, repo := identityPolicyFixture(t)
	h.cfg.IdentityAdminFile = "/private/identity.json"
	repo.values[service.SettingKeyMitoOIDCOnly] = "true"
	blocked := []string{"/login", "/register", "/forgot-password", "/reset-password", "/send-verify-code", "/passkey/login/begin", "/passkey/login/finish", "/oauth/github/start", "/oauth/google/callback", "/oauth/linuxdo/complete-registration", "/oauth/wechat/start", "/oauth/dingtalk/start"}
	allowed := []string{"/refresh", "/logout", "/backchannel-logout", "/login/2fa", "/oauth/oidc/start", "/oauth/oidc/callback", "/oauth/pending/exchange"}
	for _, paths := range []struct {
		paths  []string
		status int
	}{{blocked, 403}, {allowed, 204}} {
		for _, path := range paths.paths {
			r := gin.New()
			r.POST("/api/v1/auth"+path, h.IdentityLoginGuard, func(c *gin.Context) { c.Status(204) })
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("POST", "/api/v1/auth"+path, nil))
			require.Equal(t, paths.status, w.Code, path)
		}
	}
	require.ErrorIs(t, h.enforcePendingIdentityPolicy(context.Background(), "github", "github"), service.ErrIdentityLoginRequired)
	require.ErrorIs(t, h.enforcePendingIdentityPolicy(context.Background(), "oidc", "https://other.example"), service.ErrIdentityLoginRequired)
	require.NoError(t, h.enforcePendingIdentityPolicy(context.Background(), "oidc", h.cfg.OIDC.IssuerURL))
	for _, body := range []string{`{}`, `{"oidc_only":null}`, `{"oidc_only":false,"owner":1}`, `{"oidc_only":false}{}`} {
		require.Equal(t, http.StatusBadRequest, policyRequest(h, "PUT", body, "").Code)
	}
	repo.values[service.SettingKeyMitoOIDCOnly] = "invalid"
	_, err := h.settingSvc.MitoOIDCOnly(context.Background())
	require.ErrorIs(t, err, service.ErrServiceUnavailable)
}

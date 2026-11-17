//go:build unit

package handler

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/repository"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func TestParseOIDCBackchannelLogoutToken(t *testing.T) {
	provider := newOIDCLogoutProvider(t)
	base := func() jwt.MapClaims {
		return jwt.MapClaims{
			"iss": provider.issuer, "aud": "mito", "iat": time.Now().Unix(), "exp": time.Now().Add(2 * time.Minute).Unix(),
			"jti": "logout-jti", "sid": "idp-session",
			"events": map[string]any{oidcBackchannelLogoutEvent: map[string]any{}},
		}
	}
	tests := []struct {
		name   string
		mutate func(jwt.MapClaims)
		typ    string
		key    *rsa.PrivateKey
		ok     bool
	}{
		{name: "valid", mutate: func(jwt.MapClaims) {}, typ: "logout+jwt", key: provider.key, ok: true},
		{name: "wrong typ", mutate: func(jwt.MapClaims) {}, typ: "JWT", key: provider.key},
		{name: "legacy wrong typ", mutate: func(jwt.MapClaims) {}, typ: "Logout+JWT", key: provider.key},
		{name: "whitespace typ", mutate: func(jwt.MapClaims) {}, typ: " logout+jwt ", key: provider.key},
		{name: "wrong issuer", mutate: func(c jwt.MapClaims) { c["iss"] = "https://other.invalid" }, typ: "logout+jwt", key: provider.key},
		{name: "wrong audience", mutate: func(c jwt.MapClaims) { c["aud"] = "other-client" }, typ: "logout+jwt", key: provider.key},
		{name: "wrong signature", mutate: func(jwt.MapClaims) {}, typ: "logout+jwt", key: provider.otherKey},
		{name: "expired", mutate: func(c jwt.MapClaims) { c["exp"] = time.Now().Add(-3 * time.Minute).Unix() }, typ: "logout+jwt", key: provider.key},
		{name: "missing event", mutate: func(c jwt.MapClaims) { delete(c, "events") }, typ: "logout+jwt", key: provider.key},
		{name: "nonce present", mutate: func(c jwt.MapClaims) { c["nonce"] = "forbidden" }, typ: "logout+jwt", key: provider.key},
		{name: "missing sid", mutate: func(c jwt.MapClaims) { delete(c, "sid") }, typ: "logout+jwt", key: provider.key},
		{name: "missing jti", mutate: func(c jwt.MapClaims) { delete(c, "jti") }, typ: "logout+jwt", key: provider.key},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			claims := base()
			test.mutate(claims)
			raw := signOIDCLogoutToken(t, test.key, claims, test.typ, "logout-key")
			got, err := parseOIDCBackchannelLogoutToken(context.Background(), provider.cfg, raw)
			if !test.ok {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			require.Equal(t, "logout-jti", got.ID)
			require.Equal(t, "idp-session", got.SID)
		})
	}
}

func TestOIDCBackchannelLogoutRevokesOnlyMatchingSessionAndIsReplaySafe(t *testing.T) {
	gin.SetMode(gin.TestMode)
	provider := newOIDCLogoutProvider(t)
	h, client := newOIDCOAuthHandlerAndClient(t, false, provider.cfg)
	t.Cleanup(func() { _ = client.Close() })
	ctx := context.Background()

	rdb := redis.NewClient(&redis.Options{Addr: miniredis.RunT(t).Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	h.authService = service.NewAuthService(
		client,
		&oauthPendingFlowUserRepo{client: client},
		nil,
		repository.NewRefreshTokenCache(rdb),
		h.cfg,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
	)

	owner, err := client.User.Create().SetEmail("backchannel@example.invalid").SetPasswordHash("hash").
		SetRole(service.RoleUser).SetStatus(service.StatusActive).Save(ctx)
	require.NoError(t, err)
	_, err = client.AuthIdentity.Create().SetUserID(owner.ID).SetProviderType("oidc").
		SetProviderKey(provider.issuer).SetProviderSubject("subject-1").Save(ctx)
	require.NoError(t, err)
	user, err := h.userService.GetByID(ctx, owner.ID)
	require.NoError(t, err)
	a, err := h.authService.GenerateOAuthTokenPair(ctx, user, "oidc", provider.issuer, "subject-1")
	require.NoError(t, err)
	b, err := h.authService.GenerateOAuthTokenPair(ctx, user, "oidc", provider.issuer, "subject-1")
	require.NoError(t, err)
	require.NoError(t, h.authService.BindOIDCSessionPair(ctx, a, provider.issuer, "idp-session-a"))
	require.NoError(t, h.authService.BindOIDCSessionPair(ctx, b, provider.issuer, "idp-session-b"))

	post := func(raw string) int {
		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		form := url.Values{"logout_token": {raw}}
		c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/backchannel-logout", strings.NewReader(form.Encode()))
		c.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		h.OIDCBackchannelLogout(c)
		return recorder.Code
	}
	valid := func(sid, jti string) string {
		return signOIDCLogoutToken(t, provider.key, jwt.MapClaims{
			"iss": provider.issuer, "aud": "mito", "iat": time.Now().Unix(), "exp": time.Now().Add(2 * time.Minute).Unix(),
			"jti": jti, "sid": sid,
			"events": map[string]any{oidcBackchannelLogoutEvent: map[string]any{}},
		}, "logout+jwt", "logout-key")
	}

	require.Equal(t, http.StatusBadRequest, post(signOIDCLogoutToken(t, provider.otherKey, jwt.MapClaims{
		"iss": provider.issuer, "aud": "mito", "iat": time.Now().Unix(), "exp": time.Now().Add(2 * time.Minute).Unix(),
		"jti": "bad-signature", "sid": "idp-session-a",
		"events": map[string]any{oidcBackchannelLogoutEvent: map[string]any{}},
	}, "logout+jwt", "logout-key")))
	claimsA, err := h.authService.ValidateToken(a.AccessToken)
	require.NoError(t, err)
	require.NoError(t, h.authService.ValidateTokenIdentity(ctx, claimsA))

	logoutA := valid("idp-session-a", "logout-a")
	require.Equal(t, http.StatusOK, post(logoutA))
	require.ErrorIs(t, h.authService.ValidateTokenIdentity(ctx, claimsA), service.ErrTokenRevoked)
	claimsB, err := h.authService.ValidateToken(b.AccessToken)
	require.NoError(t, err)
	require.NoError(t, h.authService.ValidateTokenIdentity(ctx, claimsB))
	require.Equal(t, http.StatusOK, post(logoutA), "replaying a verified Logout Token is idempotent")
	require.NoError(t, h.authService.ValidateTokenIdentity(ctx, claimsB), "another IdP session must remain active")
	require.Equal(t, http.StatusOK, post(valid("idp-session-b", "logout-a")), "a replayed jti is acknowledged")
	require.NoError(t, h.authService.ValidateTokenIdentity(ctx, claimsB), "a replayed jti must not revoke another IdP session")
}

type oidcLogoutProvider struct {
	issuer   string
	key      *rsa.PrivateKey
	otherKey *rsa.PrivateKey
	cfg      config.OIDCConnectConfig
}

func newOIDCLogoutProvider(t *testing.T) *oidcLogoutProvider {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	otherKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	jwks := oidcJWKSet{Keys: []oidcJWK{buildRSAJWK("logout-key", &key.PublicKey)}}
	var issuer string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/jwks" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		require.NoError(t, json.NewEncoder(w).Encode(jwks))
	}))
	t.Cleanup(server.Close)
	issuer = server.URL
	cfg := config.OIDCConnectConfig{
		Enabled: true, ProviderName: "Keycloak", ClientID: "mito", ClientSecret: "fixture-secret",
		IssuerURL: issuer, JWKSURL: issuer + "/jwks", AllowedSigningAlgs: "RS256", ClockSkewSeconds: 120,
		AuthorizeURL: issuer + "/authorize", TokenURL: issuer + "/token",
		RedirectURL: "https://mito.example/api/v1/auth/oauth/oidc/callback", FrontendRedirectURL: "/auth/oidc/callback",
		Scopes: "openid profile", TokenAuthMethod: "client_secret_post", ValidateIDToken: true,
	}
	return &oidcLogoutProvider{issuer: issuer, key: key, otherKey: otherKey, cfg: cfg}
}

func signOIDCLogoutToken(t *testing.T, key *rsa.PrivateKey, claims jwt.MapClaims, typ, kid string) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["typ"] = typ
	token.Header["kid"] = kid
	raw, err := token.SignedString(key)
	require.NoError(t, err)
	return raw
}

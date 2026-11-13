//go:build unit

package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/ent/authidentity"
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/repository"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

// Exercise the real pending exchange, both refresh paths and HTTP middleware.
// Delete only the binding, leaving Redis intact to simulate failed cache cleanup.
func TestOIDCSessionRevocationAfterUnbindAndRebind(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx := context.Background()
	h, client := newOAuthPendingFlowTestHandler(t, false)
	t.Cleanup(func() { _ = client.Close() })
	owner, err := client.User.Create().SetEmail("oidc-session@example.invalid").
		SetPasswordHash("password-hash").SetRole(service.RoleAdmin).SetStatus(service.StatusActive).Save(ctx)
	require.NoError(t, err)
	rdb := redis.NewClient(&redis.Options{Addr: miniredis.RunT(t).Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	repo := &oauthPendingFlowUserRepo{client: client}
	h.authService = service.NewAuthService(client, repo, nil, repository.NewRefreshTokenCache(rdb),
		&config.Config{JWT: config.JWTConfig{Secret: "oidc-session-test-secret", AccessTokenExpireMinutes: 60, RefreshTokenExpireDays: 7}},
		h.settingSvc, nil, nil, nil, nil, nil, nil, nil)
	user, err := h.userService.GetByID(ctx, owner.ID)
	require.NoError(t, err)
	passwordToken, err := h.authService.GenerateToken(ctx, user)
	require.NoError(t, err)

	router := gin.New()
	router.GET("/protected", gin.HandlerFunc(middleware.NewJWTAuthMiddleware(h.authService, h.userService, nil, nil)), func(c *gin.Context) { c.Status(http.StatusOK) })
	router.GET("/admin", gin.HandlerFunc(middleware.NewAdminAuthMiddleware(h.authService, h.userService, nil, nil)), func(c *gin.Context) { c.Status(http.StatusOK) })
	status := func(token string) int {
		result := 0
		for _, path := range []string{"/protected", "/admin"} {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			if result != 0 {
				require.Equal(t, result, w.Code, "normal and admin routes must enforce the same binding state")
			}
			result = w.Code
		}
		return result
	}
	exchange := func(suffix string) service.TokenPair {
		proof := map[string]any{"issuer": "https://issuer.example", "subject": "oidc-session-subject", "verified_at": time.Now().Add(-time.Second).UTC().Format(time.RFC3339Nano)}
		session, err := client.PendingAuthSession.Create().SetSessionToken("oidc-session-" + suffix).
			SetIntent(oauthIntentLogin).SetProviderType("oidc").SetProviderKey("https://issuer.example").
			SetProviderSubject("oidc-session-subject").SetTargetUserID(owner.ID).SetResolvedEmail(owner.Email).
			SetBrowserSessionKey("oidc-browser-" + suffix).SetExpiresAt(time.Now().Add(10 * time.Minute)).
			SetUpstreamIdentityClaims(map[string]any{"issuer": "https://issuer.example"}).
			SetLocalFlowState(map[string]any{oauthCompletionResponseKey: map[string]any{"access_token": "pending"}, oauthOIDCVerificationKey: proof}).Save(ctx)
		require.NoError(t, err)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/oauth/pending/exchange", bytes.NewBufferString(`{"adopt_display_name":false,"adopt_avatar":false}`))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(&http.Cookie{Name: oauthPendingSessionCookieName, Value: encodeCookieValue(session.SessionToken)})
		req.AddCookie(&http.Cookie{Name: oauthPendingBrowserCookieName, Value: encodeCookieValue(session.BrowserSessionKey)})
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = req
		h.ExchangePendingOAuthCompletion(c)
		require.Equal(t, http.StatusOK, w.Code, w.Body.String())
		var response struct {
			Data service.TokenPair `json:"data"`
		}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
		require.NotEmpty(t, response.Data.AccessToken)
		require.NotEmpty(t, response.Data.RefreshToken)
		return response.Data
	}

	pair := exchange("original")
	identity, err := client.AuthIdentity.Query().Where(authidentity.ProviderTypeEQ("oidc")).Only(ctx)
	require.NoError(t, err)
	rotated, err := h.authService.RefreshTokenPair(ctx, pair.RefreshToken)
	require.NoError(t, err)
	rotatedAgain, err := h.authService.RefreshTokenPair(ctx, rotated.RefreshToken)
	require.NoError(t, err)
	legacyRefresh, err := h.authService.RefreshToken(ctx, pair.AccessToken)
	require.NoError(t, err)
	tokens := []string{pair.AccessToken, rotated.AccessToken, rotatedAgain.AccessToken, legacyRefresh}
	for _, token := range tokens {
		require.Equal(t, http.StatusOK, status(token))
	}
	require.NoError(t, repository.NewUserRepository(client, nil).UnbindUserAuthProvider(ctx, owner.ID, "oidc"))
	for _, token := range tokens {
		require.Equal(t, http.StatusUnauthorized, status(token), "unbinding must revoke every token derived from the OIDC binding")
	}
	bindContext, _ := gin.CreateTestContext(httptest.NewRecorder())
	bindContext.Request = httptest.NewRequest(http.MethodGet, "/api/v1/auth/oauth/oidc/bind/start", nil)
	bindContext.Request.AddCookie(&http.Cookie{Name: oauthBindAccessTokenCookieName, Value: pair.AccessToken})
	_, err = h.resolveOAuthBindTargetUserID(bindContext)
	require.ErrorIs(t, err, service.ErrTokenRevoked, "the bind callback must also reject a revoked access token")
	_, err = h.authService.RefreshTokenPair(ctx, rotatedAgain.RefreshToken)
	require.ErrorIs(t, err, service.ErrTokenRevoked)
	_, err = h.authService.RefreshToken(ctx, pair.AccessToken)
	require.ErrorIs(t, err, service.ErrTokenRevoked)
	require.Equal(t, http.StatusOK, status(passwordToken), "independent password session must remain usable")

	fresh := exchange("rebound")
	rebound, err := client.AuthIdentity.Query().Where(authidentity.ProviderTypeEQ("oidc")).Only(ctx)
	require.NoError(t, err)
	require.NotEqual(t, identity.ID, rebound.ID)
	for _, token := range tokens {
		require.Equal(t, http.StatusUnauthorized, status(token), "rebinding the same issuer/subject must not restore old sessions")
	}
	require.Equal(t, http.StatusOK, status(fresh.AccessToken))
	claims, err := h.authService.ValidateToken(fresh.AccessToken)
	require.NoError(t, err)
	require.Equal(t, rebound.ID, claims.AuthIdentityID)
	require.ErrorIs(t, h.authService.ValidateTokenIdentity(ctx, &service.JWTClaims{UserID: owner.ID + 1, AuthIdentityID: rebound.ID}), service.ErrTokenRevoked)
	require.NoError(t, client.Close())
	require.Equal(t, http.StatusServiceUnavailable, status(fresh.AccessToken), "database errors must fail closed without misreporting identity revocation")
}

package handler

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/repository"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func TestChituSSOContinuesRotatedMitoSessionWithoutProviderCookie(t *testing.T) {
	h, client, _ := identityPolicyFixture(t)
	h.cfg.ChituSSOOrigin = "https://chitu.example"
	redisServer := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: redisServer.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	cache := repository.NewRefreshTokenCache(rdb)
	h.authService = service.NewAuthService(client, &oauthPendingFlowUserRepo{client: client}, nil, cache, h.cfg, h.settingSvc, nil, nil, nil, nil, nil, nil, nil)
	ctx := context.Background()
	stored, err := client.User.Create().SetEmail("sso@example.invalid").SetPasswordHash("unchanged").SetRole("user").SetStatus("active").Save(ctx)
	require.NoError(t, err)
	identity, err := client.AuthIdentity.Create().SetUserID(stored.ID).SetProviderType("oidc").SetProviderKey(h.cfg.OIDC.IssuerURL).SetProviderSubject("sso-person").Save(ctx)
	require.NoError(t, err)
	user, err := h.userService.GetByID(ctx, stored.ID)
	require.NoError(t, err)
	pair, err := h.authService.GenerateOAuthTokenPair(ctx, user, "oidc", h.cfg.OIDC.IssuerURL, "sso-person")
	require.NoError(t, err)
	// Rotation only uses Mito's local refresh cache. No IdP browser cookie or
	// provider refresh endpoint exists in this fixture.
	rotated, err := h.authService.RefreshTokenPair(ctx, pair.RefreshToken)
	require.NoError(t, err)
	verifier := strings.Repeat("v", 64)
	sum := sha256.Sum256([]byte(verifier))
	challenge := base64.RawURLEncoding.EncodeToString(sum[:])
	proof := hex.EncodeToString(sum[:])
	call := func(path, body, bearer string) *httptest.ResponseRecorder {
		r := gin.New()
		h.RegisterChituSSO(r.Group("/api/v1/auth/chitu"))
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/chitu/"+path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if bearer != "" {
			req.Header.Set("Authorization", "Bearer "+bearer)
		}
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	authorize := func() string {
		w := call("authorize", `{"state":"`+strings.Repeat("a", 64)+`","code_challenge":"`+challenge+`"}`, rotated.AccessToken)
		require.Equal(t, 200, w.Code, w.Body.String())
		var response struct {
			Data struct {
				URL string `json:"authorize_url"`
			} `json:"data"`
		}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
		u, err := url.Parse(response.Data.URL)
		require.NoError(t, err)
		require.Equal(t, "https://chitu.example/api/v1/auth/mito/callback", u.Scheme+"://"+u.Host+u.Path)
		require.NotContains(t, response.Data.URL, rotated.AccessToken)
		require.NotContains(t, response.Data.URL, rotated.RefreshToken)
		return u.Query().Get("code")
	}
	exchange := func(code, v string) *httptest.ResponseRecorder {
		return call("exchange", `{"code":"`+code+`","code_verifier":"`+v+`","session_proof":"`+proof+`"}`, "")
	}
	require.Equal(t, 401, call("authorize", `{"state":"`+strings.Repeat("a", 64)+`","code_challenge":"`+challenge+`"}`, "").Code)
	bad := authorize()
	require.Equal(t, 401, exchange(bad, strings.Repeat("x", 64)).Code)
	require.Equal(t, 401, exchange(bad, verifier).Code, "a failed exchange must consume the code")
	expired := authorize()
	redisServer.FastForward(61 * time.Second)
	require.Equal(t, 401, exchange(expired, verifier).Code, "expired codes must be rejected")
	code := authorize()
	// Original access expiry must not break the same locally refreshed family.
	record, err := cache.(service.ChituSSOCache).LoadChituSSO(ctx, "code", testSSOHash(code), false)
	require.NoError(t, err)
	record.AccessExpiresAt = time.Now().Add(-time.Minute)
	require.NoError(t, cache.(service.ChituSSOCache).StoreChituSSO(ctx, "code", testSSOHash(code), record, time.Minute))
	w := exchange(code, verifier)
	require.Equal(t, 200, w.Code, w.Body.String())
	require.Contains(t, w.Body.String(), `"subject":"sso-person"`)
	require.Contains(t, w.Body.String(), h.cfg.OIDC.IssuerURL)
	require.Equal(t, 401, exchange(code, verifier).Code)
	require.Equal(t, 200, call("introspect", `{"session_proof":"`+proof+`"}`, "").Code)
	// Rotation after Chitu login keeps the proof attached to the same family.
	rotatedAgain, err := h.authService.RefreshTokenPair(ctx, rotated.RefreshToken)
	require.NoError(t, err)
	require.Equal(t, 200, call("introspect", `{"session_proof":"`+proof+`"}`, "").Code)
	require.NotEmpty(t, rotatedAgain.AccessToken)
	// Instance policy and live user/cache failures must never grant a session.
	h.cfg.ChituSSOOrigin = ""
	require.Equal(t, 503, call("introspect", `{"session_proof":"`+proof+`"}`, "").Code)
	h.cfg.ChituSSOOrigin = "https://chitu.example"
	require.NoError(t, client.User.UpdateOneID(stored.ID).SetStatus("inactive").Exec(ctx))
	require.Equal(t, 401, call("introspect", `{"session_proof":"`+proof+`"}`, "").Code)
	require.NoError(t, client.User.UpdateOneID(stored.ID).SetStatus("active").Exec(ctx))
	redisServer.SetError("synthetic cache unavailable")
	require.Equal(t, 503, call("introspect", `{"session_proof":"`+proof+`"}`, "").Code)
	redisServer.SetError("")
	require.Equal(t, 200, call("introspect", `{"session_proof":"`+proof+`"}`, "").Code)
	// OIDC binding deletion/recreation must not resurrect an old Mito session.
	require.NoError(t, client.AuthIdentity.DeleteOneID(identity.ID).Exec(ctx))
	require.Equal(t, 401, call("introspect", `{"session_proof":"`+proof+`"}`, "").Code)
}

func TestChituSSOLogoutRevokesLocalFamilyBeforeProviderLogout(t *testing.T) {
	for _, source := range []string{"mito", "chitu"} {
		t.Run(source, func(t *testing.T) {
			h, client, _ := identityPolicyFixture(t)
			h.cfg.ChituSSOOrigin = "https://chitu.example"
			ctx := context.Background()
			stored, err := client.User.Create().SetEmail("sso-logout@example.invalid").SetPasswordHash("unchanged").SetRole("user").SetStatus("active").Save(ctx)
			require.NoError(t, err)
			_, err = client.AuthIdentity.Create().SetUserID(stored.ID).SetProviderType("oidc").SetProviderKey(h.cfg.OIDC.IssuerURL).SetProviderSubject("sso-logout").Save(ctx)
			require.NoError(t, err)
			user, err := h.userService.GetByID(ctx, stored.ID)
			require.NoError(t, err)
			pair, err := h.authService.GenerateOAuthTokenPair(ctx, user, "oidc", h.cfg.OIDC.IssuerURL, "sso-logout")
			require.NoError(t, err)
			verifier := strings.Repeat("v", 64)
			sum := sha256.Sum256([]byte(verifier))
			proof := hex.EncodeToString(sum[:])
			code, err := h.authService.AuthorizeChituSSO(ctx, pair.AccessToken, base64.RawURLEncoding.EncodeToString(sum[:]))
			require.NoError(t, err)
			_, err = h.authService.ExchangeChituSSO(ctx, code, verifier, proof)
			require.NoError(t, err)
			if source == "mito" {
				require.NoError(t, h.authService.RevokeRefreshToken(ctx, pair.RefreshToken))
			} else {
				require.NoError(t, h.authService.RevokeChituSSO(ctx, proof))
			}
			claims, err := h.authService.ValidateToken(pair.AccessToken)
			require.NoError(t, err)
			require.ErrorIs(t, h.authService.ValidateTokenIdentity(ctx, claims), service.ErrTokenRevoked)
			_, err = h.authService.IntrospectChituSSO(ctx, proof)
			require.ErrorIs(t, err, service.ErrTokenRevoked)
		})
	}
}

func testSSOHash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	middleware "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestIdentityPasswordLocalMutationBlockedAndRestoredWhenPolicyDisabled(t *testing.T) {
	h, client, repo := identityPolicyFixture(t)
	ctx := context.Background()
	u := &service.User{}
	require.NoError(t, u.SetPassword("local-before-9!"))
	user, err := client.User.Create().SetEmail("password@example.test").SetPasswordHash(u.PasswordHash).SetRole("user").SetStatus("active").Save(ctx)
	require.NoError(t, err)
	h.cfg.IdentityAdminFile = "/private/identity.json"
	handler := &UserHandler{userService: h.userService, authService: h.authService}
	change := func() *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Set(string(middleware.ContextKeyUser), middleware.AuthSubject{UserID: user.ID})
		c.Request = httptest.NewRequest("PUT", "/user/password", strings.NewReader(`{"old_password":"local-before-9!","new_password":"local-after-9!"}`))
		c.Request.Header.Set("Content-Type", "application/json")
		handler.ChangePassword(c)
		return rec
	}
	repo.values[service.SettingKeyMitoOIDCOnly] = "true"
	rec := change()
	require.Equal(t, 403, rec.Code, rec.Body.String())
	require.Contains(t, rec.Body.String(), "identity_password_managed")
	unchanged, err := client.User.Get(ctx, user.ID)
	require.NoError(t, err)
	require.Equal(t, user.PasswordHash, unchanged.PasswordHash)
	repo.err = errors.New("settings unavailable")
	require.Equal(t, 503, change().Code)
	repo.err = nil
	repo.values[service.SettingKeyMitoOIDCOnly] = "false"
	rec = change()
	require.Equal(t, 200, rec.Code, rec.Body.String())
	updated, err := h.userService.GetByID(ctx, user.ID)
	require.NoError(t, err)
	require.True(t, updated.CheckPassword("local-after-9!"))
	// A shared official instance continues using local credentials.
	h.cfg.IdentityAdminFile = ""
	repo.values[service.SettingKeyMitoOIDCOnly] = "true"
	require.NoError(t, h.authService.CheckLocalPasswordChange(ctx))
}

func TestIdentityPasswordStartRequiresUnifiedSessionAndUsesPKCEProviderAction(t *testing.T) {
	h, client, _ := identityPolicyFixture(t)
	ctx := context.Background()
	user, err := client.User.Create().SetEmail("password-flow@example.test").SetPasswordHash("unchanged-local-hash").SetRole("user").SetStatus("active").Save(ctx)
	require.NoError(t, err)
	_, err = client.AuthIdentity.Create().SetUserID(user.ID).SetProviderType("oidc").SetProviderKey(h.cfg.OIDC.IssuerURL).SetProviderSubject("password-person").Save(ctx)
	require.NoError(t, err)
	u, err := h.userService.GetByID(ctx, user.ID)
	require.NoError(t, err)
	local, err := h.authService.GenerateTokenPair(ctx, u, "")
	require.NoError(t, err)
	unified, err := h.authService.GenerateOAuthTokenPair(ctx, u, "oidc", h.cfg.OIDC.IssuerURL, "password-person")
	require.NoError(t, err)
	h.cfg.IdentityAdminFile = "/private/identity.json"
	start := func(bearer string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Request = httptest.NewRequest("POST", "/user/password/identity/start?redirect=https://evil.example&intent=bind_current_user&kc_action=delete_account", nil)
		c.Request.Header.Set("Authorization", "Bearer "+bearer)
		h.OIDCPasswordStart(c)
		return rec
	}
	require.Equal(t, 403, start("").Code)
	require.Equal(t, 403, start(local.AccessToken).Code)
	rec := start(unified.AccessToken)
	require.Equal(t, 200, rec.Code, rec.Body.String())
	var result struct {
		Data struct {
			AuthorizeURL string `json:"authorize_url"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	destination, err := url.Parse(result.Data.AuthorizeURL)
	require.NoError(t, err)
	q := destination.Query()
	require.Equal(t, "UPDATE_PASSWORD", q.Get("kc_action"))
	require.Equal(t, "login", q.Get("prompt"))
	require.Equal(t, "S256", q.Get("code_challenge_method"))
	require.NotEmpty(t, q.Get("code_challenge"))
	require.NotEmpty(t, q.Get("nonce"))
	require.NotEmpty(t, q.Get("state"))
	cookies := map[string]string{}
	for _, cookie := range rec.Result().Cookies() {
		value, _ := url.QueryUnescape(cookie.Value)
		cookies[cookie.Name] = value
	}
	require.NotContains(t, cookies[oidcOAuthRedirectCookie], "evil")
	require.NotContains(t, cookies[oidcOAuthIntentCookieName], "bind")
	unchanged, err := client.User.Get(ctx, user.ID)
	require.NoError(t, err)
	require.Equal(t, "unchanged-local-hash", unchanged.PasswordHash)
}

func TestCustomMenuPageAccessUsesOrdinaryAudienceForContentAndImages(t *testing.T) {
	h, _, repo := identityPolicyFixture(t)
	repo.values[service.SettingKeyCustomMenuItems] = `[{"id":"shared","url":"md:shared","visibility":"admin","user_visible":true},{"id":"private","url":"md:private","visibility":"user","user_visible":false}]`
	pages := NewPageHandler(t.TempDir(), h.settingSvc)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest("GET", "/pages/shared", nil)
	c.Set(string(middleware.ContextKeyUserRole), "user")
	require.True(t, pages.checkSlugVisibility(c, "shared"))
	require.True(t, pages.checkImageSlugVisibility(c, "shared"))
	require.False(t, pages.checkSlugVisibility(c, "private"))
	require.False(t, pages.checkImageSlugVisibility(c, "private"))
	c.Set(string(middleware.ContextKeyUserRole), "admin")
	require.True(t, pages.checkSlugVisibility(c, "private"))
}

package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func oidcRegistrationTestConfig(usePKCE, validateIDToken bool) config.OIDCConnectConfig {
	return config.OIDCConnectConfig{
		Enabled:             true,
		RegistrationEnabled: true,
		ProviderName:        "Unified identity",
		ClientID:            "oidc-client",
		ClientSecret:        "oidc-secret",
		IssuerURL:           "https://issuer.example.com",
		AuthorizeURL:        "https://issuer.example.com/oauth/authorize",
		TokenURL:            "https://issuer.example.com/oauth/token",
		UserInfoURL:         "https://issuer.example.com/oauth/userinfo",
		JWKSURL:             "https://issuer.example.com/oauth/jwks",
		Scopes:              "openid profile email",
		RedirectURL:         "https://api.example.com/api/v1/auth/oauth/oidc/callback",
		FrontendRedirectURL: "/auth/oidc/callback",
		TokenAuthMethod:     "client_secret_post",
		UsePKCE:             usePKCE,
		ValidateIDToken:     validateIDToken,
		AllowedSigningAlgs:  "RS256",
		ClockSkewSeconds:    120,
	}
}

func callOIDCRegistrationStart(t *testing.T, h *AuthHandler) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(
		http.MethodPost,
		"https://api.example.com/api/v1/auth/oauth/oidc/register/start",
		strings.NewReader(`{"email":"new-user@example.com","redirect":"/dashboard"}`),
	)
	c.Request.Header.Set("Content-Type", "application/json")
	h.OIDCOAuthRegistrationStart(c)
	return recorder
}

func TestOIDCRegistrationDefaultIsDisabled(t *testing.T) {
	cfg := oidcRegistrationTestConfig(true, true)
	cfg.RegistrationEnabled = false
	settingSvc := service.NewSettingService(&oauthPendingFlowSettingRepoStub{values: map[string]string{
		service.SettingKeyOIDCConnectEnabled: "true",
	}}, &config.Config{OIDC: cfg})
	settings, err := settingSvc.GetPublicSettings(context.Background())
	require.NoError(t, err)
	require.False(t, settings.OIDCRegistrationEnabled)
}

func TestOIDCRegistrationEmailVerificationPolicy(t *testing.T) {
	verified := true
	unverified := false
	for _, tc := range []struct {
		name     string
		required bool
		claim    *bool
		want     bool
	}{
		{name: "not_required_missing_claim", required: false, claim: nil, want: true},
		{name: "not_required_unverified_claim", required: false, claim: &unverified, want: true},
		{name: "required_missing_claim", required: true, claim: nil, want: false},
		{name: "required_unverified_claim", required: true, claim: &unverified, want: false},
		{name: "required_verified_claim", required: true, claim: &verified, want: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cfg := oidcRegistrationTestConfig(true, true)
			cfg.RequireEmailVerified = tc.required
			require.Equal(t, tc.want, oidcEmailVerificationSatisfied(cfg, tc.claim))
		})
	}
}

func TestOIDCRegistrationStartRequiresRegistrationSetting(t *testing.T) {
	cfg := oidcRegistrationTestConfig(true, true)
	h, _ := newOIDCOAuthHandlerAndClientWithSettings(t, false, cfg, map[string]string{
		service.SettingKeyOIDCConnectRegistrationEnabled: "false",
	})
	h.secretEncryptor = oauthPendingFlowTotpEncryptorStub{}

	recorder := callOIDCRegistrationStart(t, h)

	require.Equal(t, http.StatusForbidden, recorder.Code)
	require.Contains(t, recorder.Body.String(), "OIDC_REGISTRATION_DISABLED")
	require.Empty(t, recorder.Header().Values("Set-Cookie"))
}

func TestOIDCRegistrationStartRejectsInsecureOIDCConfiguration(t *testing.T) {
	for _, tc := range []struct {
		name            string
		usePKCE         bool
		validateIDToken bool
	}{
		{name: "missing_pkce", usePKCE: false, validateIDToken: true},
		{name: "missing_id_token_validation", usePKCE: true, validateIDToken: false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cfg := oidcRegistrationTestConfig(tc.usePKCE, tc.validateIDToken)
			h, _ := newOIDCOAuthHandlerAndClientWithSettings(t, false, cfg, map[string]string{
				service.SettingKeyOIDCConnectRegistrationEnabled: "true",
			})
			h.secretEncryptor = oauthPendingFlowTotpEncryptorStub{}

			recorder := callOIDCRegistrationStart(t, h)

			require.Equal(t, http.StatusServiceUnavailable, recorder.Code)
			require.Contains(t, recorder.Body.String(), "OIDC_REGISTRATION_INSECURE_CONFIG")
			require.Empty(t, recorder.Header().Values("Set-Cookie"))
		})
	}
}

func TestOIDCRegistrationStartBindsIntentToBrowserAndOIDCFlow(t *testing.T) {
	cfg := oidcRegistrationTestConfig(true, true)
	h, _ := newOIDCOAuthHandlerAndClientWithSettings(t, false, cfg, map[string]string{
		service.SettingKeyOIDCConnectRegistrationEnabled: "true",
	})
	h.secretEncryptor = oauthPendingFlowTotpEncryptorStub{}

	recorder := callOIDCRegistrationStart(t, h)
	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), `"authorize_url"`)
	require.Contains(t, recorder.Body.String(), "prompt=create")
	require.Contains(t, recorder.Body.String(), "login_hint=new-user%40example.com")

	cookies := recorder.Result().Cookies()
	require.NotNil(t, findCookie(cookies, oidcOAuthStateCookieName))
	require.NotNil(t, findCookie(cookies, oidcOAuthVerifierCookie))
	require.NotNil(t, findCookie(cookies, oidcOAuthNonceCookie))
	require.NotNil(t, findCookie(cookies, oidcOAuthRedirectCookie))
	require.NotNil(t, findCookie(cookies, oauthPendingBrowserCookieName))

	intentCookie := findCookie(cookies, oidcOAuthIntentCookieName)
	require.NotNil(t, intentCookie)
	require.Equal(t, "register", decodeCookieValueForTest(t, intentCookie.Value))

	registrationCookie := findCookie(cookies, oidcOAuthRegistrationCookieName)
	require.NotNil(t, registrationCookie)
	require.NotEmpty(t, decodeCookieValueForTest(t, registrationCookie.Value))
	for _, cookie := range []*http.Cookie{intentCookie, registrationCookie} {
		require.True(t, cookie.Secure)
		require.True(t, cookie.HttpOnly)
	}
}

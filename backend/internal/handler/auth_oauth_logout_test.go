package handler

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/ent/pendingauthsession"
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
)

func TestOIDCLogoutReturnsGlobalLogoutAfterClearingLocalState(t *testing.T) {
	idp := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			w.Header().Set("Content-Type", "application/json")
			_, _ = fmt.Fprintf(w, `{"authorization_endpoint":"https://issuer.example/auth","token_endpoint":"https://issuer.example/token","jwks_uri":"https://issuer.example/keys","end_session_endpoint":"%s/logout"}`, "https://issuer.example")
		default:
			http.NotFound(w, r)
		}
	}))
	defer idp.Close()
	handler, client := newOIDCOAuthHandlerAndClientWithSettings(t, false, config.OIDCConnectConfig{
		Enabled: true, ProviderName: "OIDC", ClientID: "mito", ClientSecret: "fixture-secret",
		IssuerURL: idp.URL, RedirectURL: "https://mito.example/api/v1/auth/oauth/oidc/callback",
		FrontendRedirectURL: "/auth/oidc/callback", Scopes: "openid profile", TokenAuthMethod: "client_secret_post",
		ValidateIDToken: true, AllowedSigningAlgs: "RS256", ClockSkewSeconds: 120,
	}, nil)
	handler.cfg.Server.FrontendURL = "https://mito.example"
	ctx := context.Background()
	owner, err := client.User.Create().SetEmail("global-logout@example.invalid").SetPasswordHash("hash").SetStatus(service.StatusActive).Save(ctx)
	require.NoError(t, err)
	_, err = client.AuthIdentity.Create().SetUserID(owner.ID).SetProviderType("oidc").SetProviderKey(idp.URL).SetProviderSubject("subject-1").Save(ctx)
	require.NoError(t, err)
	user, err := handler.userService.GetByID(ctx, owner.ID)
	require.NoError(t, err)
	pair, err := handler.authService.GenerateOAuthTokenPair(ctx, user, "oidc", idp.URL, "subject-1")
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ginCtx, _ := gin.CreateTestContext(recorder)
	ginCtx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	ginCtx.Request.Header.Set("Authorization", "Bearer "+pair.AccessToken)
	handler.Logout(ginCtx)
	require.Equal(t, http.StatusOK, recorder.Code)
	data := decodeJSONResponseData(t, recorder)
	logoutURL, ok := data["logout_url"].(string)
	require.True(t, ok)
	require.Contains(t, logoutURL, "client_id=mito")
	require.Contains(t, logoutURL, "post_logout_redirect_uri=https%3A%2F%2Fmito.example%2Flogin")
	require.NotEmpty(t, recorder.Result().Cookies())
}

func TestOIDCLogoutReturnsOnlyLocalLogoutForNonCurrentOIDCSessions(t *testing.T) {
	for _, testCase := range []string{"password", "expired", "unbound"} {
		t.Run(testCase, func(t *testing.T) {
			idp := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != "/.well-known/openid-configuration" {
					http.NotFound(w, r)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"authorization_endpoint":"https://issuer.example/auth","token_endpoint":"https://issuer.example/token","jwks_uri":"https://issuer.example/keys","end_session_endpoint":"https://issuer.example/logout"}`))
			}))
			defer idp.Close()
			handler, client := newOIDCOAuthHandlerAndClientWithSettings(t, false, config.OIDCConnectConfig{
				Enabled: true, ProviderName: "OIDC", ClientID: "mito", ClientSecret: "fixture-secret",
				IssuerURL: idp.URL, RedirectURL: "https://mito.example/api/v1/auth/oauth/oidc/callback",
				FrontendRedirectURL: "/auth/oidc/callback", Scopes: "openid profile", TokenAuthMethod: "client_secret_post",
				ValidateIDToken: true, AllowedSigningAlgs: "RS256", ClockSkewSeconds: 120,
			}, nil)
			handler.cfg.Server.FrontendURL = "https://mito.example"
			ctx := context.Background()
			owner, err := client.User.Create().SetEmail(testCase + "-logout@example.invalid").SetPasswordHash("hash").SetStatus(service.StatusActive).Save(ctx)
			require.NoError(t, err)
			identity, err := client.AuthIdentity.Create().SetUserID(owner.ID).SetProviderType("oidc").SetProviderKey(idp.URL).SetProviderSubject("subject-" + testCase).Save(ctx)
			require.NoError(t, err)
			user, err := handler.userService.GetByID(ctx, owner.ID)
			require.NoError(t, err)

			var accessToken string
			switch testCase {
			case "password":
				pair, err := handler.authService.GenerateTokenPair(ctx, user, "")
				require.NoError(t, err)
				accessToken = pair.AccessToken
			case "expired":
				expired := jwt.NewWithClaims(jwt.SigningMethodHS256, &service.JWTClaims{
					UserID: user.ID, AuthIdentityID: identity.ID,
					RegisteredClaims: jwt.RegisteredClaims{
						ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Minute)),
						IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Minute)),
					},
				})
				accessToken, err = expired.SignedString([]byte(handler.cfg.JWT.Secret))
				require.NoError(t, err)
			case "unbound":
				pair, err := handler.authService.GenerateOAuthTokenPair(ctx, user, "oidc", idp.URL, "subject-unbound")
				require.NoError(t, err)
				accessToken = pair.AccessToken
				require.NoError(t, client.AuthIdentity.DeleteOneID(identity.ID).Exec(ctx))
			}

			recorder := httptest.NewRecorder()
			ginCtx, _ := gin.CreateTestContext(recorder)
			ginCtx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
			ginCtx.Request.Header.Set("Authorization", "Bearer "+accessToken)
			handler.Logout(ginCtx)
			require.Equal(t, http.StatusOK, recorder.Code)
			require.NotContains(t, decodeJSONResponseData(t, recorder), "logout_url")
		})
	}
}

func TestOIDCLogoutCompletesLocallyWhenLogoutDiscoveryIsUnavailable(t *testing.T) {
	for name, metadata := range map[string]string{
		"missing":  `{"authorization_endpoint":"https://issuer.example/auth","token_endpoint":"https://issuer.example/token","jwks_uri":"https://issuer.example/keys"}`,
		"insecure": `{"authorization_endpoint":"https://issuer.example/auth","token_endpoint":"https://issuer.example/token","jwks_uri":"https://issuer.example/keys","end_session_endpoint":"http://issuer.example/logout"}`,
	} {
		t.Run(name, func(t *testing.T) {
			idp := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(metadata))
			}))
			defer idp.Close()
			handler, client := newOIDCOAuthHandlerAndClientWithSettings(t, false, config.OIDCConnectConfig{
				Enabled: true, ProviderName: "OIDC", ClientID: "mito", ClientSecret: "fixture-secret",
				IssuerURL: idp.URL, RedirectURL: "https://mito.example/api/v1/auth/oauth/oidc/callback",
				FrontendRedirectURL: "/auth/oidc/callback", Scopes: "openid profile", TokenAuthMethod: "client_secret_post",
				ValidateIDToken: true, AllowedSigningAlgs: "RS256", ClockSkewSeconds: 120,
			}, nil)
			handler.cfg.Server.FrontendURL = "https://mito.example"
			ctx := context.Background()
			owner, err := client.User.Create().SetEmail(name + "-logout@example.invalid").SetPasswordHash("hash").SetStatus(service.StatusActive).Save(ctx)
			require.NoError(t, err)
			_, err = client.AuthIdentity.Create().SetUserID(owner.ID).SetProviderType("oidc").SetProviderKey(idp.URL).SetProviderSubject("subject-" + name).Save(ctx)
			require.NoError(t, err)
			user, err := handler.userService.GetByID(ctx, owner.ID)
			require.NoError(t, err)
			pair, err := handler.authService.GenerateOAuthTokenPair(ctx, user, "oidc", idp.URL, "subject-"+name)
			require.NoError(t, err)

			recorder := httptest.NewRecorder()
			ginCtx, _ := gin.CreateTestContext(recorder)
			ginCtx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
			ginCtx.Request.Header.Set("Authorization", "Bearer "+pair.AccessToken)
			handler.Logout(ginCtx)
			require.Equal(t, http.StatusOK, recorder.Code)
			require.NotContains(t, decodeJSONResponseData(t, recorder), "logout_url")
		})
	}
}

func TestLogoutClearsOAuthStateCookiesAndConsumesPendingSession(t *testing.T) {
	handler, client := newOAuthPendingFlowTestHandler(t, false)
	ctx := context.Background()

	session, err := client.PendingAuthSession.Create().
		SetSessionToken("logout-pending-session-token").
		SetIntent("login").
		SetProviderType("oidc").
		SetProviderKey("https://issuer.example").
		SetProviderSubject("logout-subject-123").
		SetBrowserSessionKey("logout-browser-session-key").
		SetResolvedEmail("logout@example.com").
		SetExpiresAt(time.Now().UTC().Add(10 * time.Minute)).
		Save(ctx)
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ginCtx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	req.AddCookie(&http.Cookie{Name: oauthPendingSessionCookieName, Value: encodeCookieValue(session.SessionToken)})
	req.AddCookie(&http.Cookie{Name: oauthPendingBrowserCookieName, Value: encodeCookieValue("logout-browser-session-key")})
	req.AddCookie(&http.Cookie{Name: oauthBindAccessTokenCookieName, Value: "bind-access-token"})
	req.AddCookie(&http.Cookie{Name: linuxDoOAuthStateCookieName, Value: encodeCookieValue("linuxdo-state")})
	req.AddCookie(&http.Cookie{Name: oidcOAuthStateCookieName, Value: encodeCookieValue("oidc-state")})
	req.AddCookie(&http.Cookie{Name: wechatOAuthStateCookieName, Value: encodeCookieValue("wechat-state")})
	req.AddCookie(&http.Cookie{Name: wechatPaymentOAuthStateName, Value: encodeCookieValue("wechat-payment-state")})
	ginCtx.Request = req

	handler.Logout(ginCtx)

	require.Equal(t, http.StatusOK, recorder.Code)

	cookies := recorder.Result().Cookies()
	for _, name := range []string{
		oauthPendingSessionCookieName,
		oauthPendingBrowserCookieName,
		oauthBindAccessTokenCookieName,
		linuxDoOAuthStateCookieName,
		oidcOAuthStateCookieName,
		wechatOAuthStateCookieName,
		wechatPaymentOAuthStateName,
	} {
		cookie := findCookie(cookies, name)
		require.NotNil(t, cookie, name)
		require.Equal(t, -1, cookie.MaxAge, name)
		require.True(t, cookie.HttpOnly, name)
	}

	storedSession, err := client.PendingAuthSession.Query().
		Where(pendingauthsession.IDEQ(session.ID)).
		Only(ctx)
	require.NoError(t, err)
	require.NotNil(t, storedSession.ConsumedAt)
}

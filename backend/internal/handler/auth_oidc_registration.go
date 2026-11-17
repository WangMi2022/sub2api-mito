package handler

import (
	"net/url"
	"strings"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/ip"
	"github.com/Wei-Shaw/sub2api/internal/pkg/oauth"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

type oidcRegistrationStartRequest struct {
	Email                 string `json:"email" binding:"required,email"`
	VerifyCode            string `json:"verify_code,omitempty"`
	InvitationCode        string `json:"invitation_code,omitempty"`
	PromoCode             string `json:"promo_code,omitempty"`
	AffCode               string `json:"aff_code,omitempty"`
	Redirect              string `json:"redirect,omitempty"`
	TurnstileToken        string `json:"turnstile_token,omitempty"`
	TencentCaptchaTicket  string `json:"tencent_captcha_ticket,omitempty"`
	TencentCaptchaRandstr string `json:"tencent_captcha_randstr,omitempty"`
}

// OIDCOAuthRegistrationStart creates a short-lived registration intent and
// sends the browser to the unified identity provider in account-creation mode.
// POST /api/v1/auth/oauth/oidc/register/start
func (h *AuthHandler) OIDCOAuthRegistrationStart(c *gin.Context) {
	var req oidcRegistrationStartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	if h == nil || h.settingSvc == nil || h.authService == nil || h.secretEncryptor == nil {
		response.ErrorFrom(c, infraerrors.ServiceUnavailable("OIDC_REGISTRATION_NOT_READY", "unified identity registration is not configured"))
		return
	}
	publicSettings, err := h.settingSvc.GetPublicSettings(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, infraerrors.ServiceUnavailable("SETTINGS_UNAVAILABLE", "settings are unavailable").WithCause(err))
		return
	}
	if !publicSettings.RegistrationEnabled || !publicSettings.OIDCOAuthEnabled || !publicSettings.OIDCRegistrationEnabled {
		response.ErrorFrom(c, service.ErrOIDCRegistrationDisabled)
		return
	}
	cfg, err := h.getOIDCOAuthConfig(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	if !cfg.ValidateIDToken || !cfg.UsePKCE {
		response.ErrorFrom(c, infraerrors.ServiceUnavailable(
			"OIDC_REGISTRATION_INSECURE_CONFIG",
			"unified identity registration requires id_token validation and PKCE",
		))
		return
	}
	redirectURI := strings.TrimSpace(cfg.RedirectURL)
	if redirectURI == "" {
		response.ErrorFrom(c, infraerrors.ServiceUnavailable("OAUTH_CONFIG_INVALID", "oauth redirect url not configured"))
		return
	}

	state, err := oauth.GenerateState()
	if err != nil {
		response.ErrorFrom(c, infraerrors.InternalServer("OAUTH_STATE_GEN_FAILED", "failed to generate oauth state").WithCause(err))
		return
	}
	nonce, err := oauth.GenerateState()
	if err != nil {
		response.ErrorFrom(c, infraerrors.InternalServer("OAUTH_NONCE_GEN_FAILED", "failed to generate oauth nonce").WithCause(err))
		return
	}
	verifier, err := oauth.GenerateCodeVerifier()
	if err != nil {
		response.ErrorFrom(c, infraerrors.InternalServer("OAUTH_PKCE_GEN_FAILED", "failed to generate pkce verifier").WithCause(err))
		return
	}
	browserSessionKey, err := generateOAuthPendingBrowserSession()
	if err != nil {
		response.ErrorFrom(c, infraerrors.InternalServer("OAUTH_BROWSER_SESSION_GEN_FAILED", "failed to generate oauth browser session").WithCause(err))
		return
	}
	redirectTo := sanitizeFrontendRedirectPath(req.Redirect)
	if redirectTo == "" {
		redirectTo = oidcOAuthDefaultRedirectTo
	}
	result, err := h.authService.CreateOIDCRegistrationIntent(c.Request.Context(), service.OIDCRegistrationIntentInput{
		Email:             strings.TrimSpace(req.Email),
		Issuer:            strings.TrimSpace(cfg.IssuerURL),
		RedirectTo:        redirectTo,
		State:             state,
		BrowserSessionKey: browserSessionKey,
		VerifyCode:        strings.TrimSpace(req.VerifyCode),
		InvitationCode:    strings.TrimSpace(req.InvitationCode),
		PromoCode:         strings.TrimSpace(req.PromoCode),
		AffiliateCode:     strings.TrimSpace(req.AffCode),
		CaptchaProof:      captchaProof(req.TurnstileToken, req.TencentCaptchaTicket, req.TencentCaptchaRandstr),
		RemoteIP:          ip.GetClientIP(c),
		ExpiresAt:         time.Now().UTC().Add(oidcOAuthCookieMaxAgeSec * time.Second),
	}, h.secretEncryptor)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	secureCookie := isRequestHTTPS(c)
	oidcSetCookie(c, oidcOAuthStateCookieName, encodeCookieValue(state), oidcOAuthCookieMaxAgeSec, secureCookie)
	oidcSetCookie(c, oidcOAuthVerifierCookie, encodeCookieValue(verifier), oidcOAuthCookieMaxAgeSec, secureCookie)
	oidcSetCookie(c, oidcOAuthRedirectCookie, encodeCookieValue(redirectTo), oidcOAuthCookieMaxAgeSec, secureCookie)
	oidcSetCookie(c, oidcOAuthNonceCookie, encodeCookieValue(nonce), oidcOAuthCookieMaxAgeSec, secureCookie)
	oidcSetCookie(c, oidcOAuthIntentCookieName, encodeCookieValue("register"), oidcOAuthCookieMaxAgeSec, secureCookie)
	oidcSetCookie(c, oidcOAuthRegistrationCookieName, encodeCookieValue(result.IntentToken), oidcOAuthCookieMaxAgeSec, secureCookie)
	oidcClearCookie(c, oidcOAuthBindUserCookieName, secureCookie)
	clearOAuthPromoCodeCookie(c, secureCookie)
	clearOAuthPendingSessionCookie(c, secureCookie)
	setOAuthPendingBrowserCookie(c, browserSessionKey, secureCookie)

	authURL, err := buildOIDCAuthorizeURLWithExtra(
		cfg,
		state,
		nonce,
		oauth.GenerateCodeChallenge(verifier),
		redirectURI,
		url.Values{
			"prompt":     []string{"create"},
			"login_hint": []string{strings.TrimSpace(strings.ToLower(req.Email))},
		},
	)
	if err != nil {
		response.ErrorFrom(c, infraerrors.InternalServer("OAUTH_BUILD_URL_FAILED", "failed to build oauth authorization url").WithCause(err))
		return
	}
	respondOAuthStart(c, authURL)
}

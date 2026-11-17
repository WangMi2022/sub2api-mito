package handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	oidcBackchannelLogoutEvent = "http://schemas.openid.net/event/backchannel-logout"
	oidcLogoutTokenMaxSize     = 64 << 10
)

type oidcBackchannelLogoutClaims struct {
	SID    string                     `json:"sid"`
	Events map[string]json.RawMessage `json:"events"`
	Nonce  json.RawMessage            `json:"nonce,omitempty"`
	jwt.RegisteredClaims
}

// OIDCBackchannelLogout revokes every Mito token family associated with a
// Keycloak browser session. Keycloak sends a signed Logout Token using HTTP
// form encoding; failures are intentionally terse and never reflect the token.
func (h *AuthHandler) OIDCBackchannelLogout(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, oidcLogoutTokenMaxSize)
	if err := c.Request.ParseForm(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
		return
	}
	rawTokens, ok := c.Request.PostForm["logout_token"]
	if !ok || len(rawTokens) != 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
		return
	}

	claims, err := h.verifyOIDCBackchannelLogoutToken(c.Request.Context(), strings.TrimSpace(rawTokens[0]))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
		return
	}

	ttl := time.Until(claims.ExpiresAt.Time)
	if ttl > 30*24*time.Hour {
		ttl = 30 * 24 * time.Hour
	}
	if ttl <= 0 {
		ttl = time.Second
	}
	consumed, _, err := h.authService.ConsumeOIDCLogoutAndRevoke(c.Request.Context(), claims.Issuer, claims.ID, claims.SID, ttl)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "temporarily_unavailable"})
		return
	}
	if !consumed {
		c.Header("Cache-Control", "no-store")
		c.Header("Pragma", "no-cache")
		c.Status(http.StatusOK)
		return
	}

	c.Header("Cache-Control", "no-store")
	c.Header("Pragma", "no-cache")
	c.Status(http.StatusOK)
}

func (h *AuthHandler) verifyOIDCBackchannelLogoutToken(ctx context.Context, raw string) (*oidcBackchannelLogoutClaims, error) {
	if h == nil || h.authService == nil || raw == "" || len(raw) > oidcLogoutTokenMaxSize {
		return nil, errors.New("invalid logout token")
	}
	if err := requireOIDCLogoutJWTType(raw); err != nil {
		return nil, err
	}
	cfg, err := h.getOIDCOAuthConfig(ctx)
	if err != nil {
		return nil, err
	}
	return parseOIDCBackchannelLogoutToken(ctx, cfg, raw)
}

func parseOIDCBackchannelLogoutToken(ctx context.Context, cfg config.OIDCConnectConfig, raw string) (*oidcBackchannelLogoutClaims, error) {
	if err := requireOIDCLogoutJWTType(raw); err != nil {
		return nil, err
	}
	allowed := oidcAllowedSigningAlgs(cfg.AllowedSigningAlgs)
	if len(allowed) == 0 || strings.TrimSpace(cfg.JWKSURL) == "" {
		return nil, errors.New("logout token validation is not configured")
	}
	jwks, err := oidcFetchJWKSet(ctx, cfg.JWKSURL)
	if err != nil {
		return nil, err
	}

	claims := &oidcBackchannelLogoutClaims{}
	parsed, err := jwt.ParseWithClaims(
		raw,
		claims,
		func(token *jwt.Token) (any, error) {
			alg := strings.TrimSpace(token.Method.Alg())
			if !containsString(allowed, alg) {
				return nil, errors.New("unexpected logout token signing algorithm")
			}
			kid, _ := token.Header["kid"].(string)
			return oidcFindPublicKey(jwks, strings.TrimSpace(kid), alg)
		},
		jwt.WithValidMethods(allowed),
		jwt.WithAudience(cfg.ClientID),
		jwt.WithIssuer(cfg.IssuerURL),
		jwt.WithLeeway(time.Duration(cfg.ClockSkewSeconds)*time.Second),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
	)
	if err != nil || !parsed.Valid {
		return nil, errors.New("invalid logout token")
	}
	if claims.IssuedAt == nil || claims.ExpiresAt == nil {
		return nil, errors.New("logout token missing timestamps")
	}
	if claims.ID == "" || claims.ID != strings.TrimSpace(claims.ID) || len(claims.ID) > 256 {
		return nil, errors.New("logout token missing jti")
	}
	if claims.SID == "" || claims.SID != strings.TrimSpace(claims.SID) || len(claims.SID) > 1024 {
		return nil, errors.New("logout token missing sid")
	}
	if len(claims.Nonce) != 0 {
		return nil, errors.New("logout token must not contain nonce")
	}
	event, ok := claims.Events[oidcBackchannelLogoutEvent]
	if !ok {
		return nil, errors.New("logout token missing backchannel event")
	}
	var eventValue map[string]any
	if err := json.Unmarshal(event, &eventValue); err != nil || eventValue == nil {
		return nil, errors.New("invalid backchannel event")
	}
	return claims, nil
}

func requireOIDCLogoutJWTType(raw string) error {
	parts := strings.Split(raw, ".")
	if len(parts) != 3 {
		return errors.New("logout token is not a jwt")
	}
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return errors.New("invalid logout token header")
	}
	var header struct {
		Type string `json:"typ"`
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil || header.Type != "logout+jwt" {
		return errors.New("invalid logout token type")
	}
	return nil
}

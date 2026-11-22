package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

// These endpoints have a separate boundary from password/OIDC login. Codes
// require a valid local bearer; redemption requires one-use code+S256, and
// introspection/revocation require the backend-held opaque session proof.
func (h *AuthHandler) RegisterChituSSO(group *gin.RouterGroup, authorizeMiddleware ...gin.HandlerFunc) {
	group.Use(func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.Header("Referrer-Policy", "no-referrer")
		if h.cfg == nil || h.cfg.ChituSSOOrigin == "" || h.authService == nil {
			response.ErrorFrom(c, service.ErrServiceUnavailable)
			c.Abort()
			return
		}
		c.Next()
	})
	group.POST("/authorize", append(authorizeMiddleware, h.authorizeChituSSO)...)
	group.POST("/exchange", h.exchangeChituSSO)
	group.POST("/introspect", h.introspectChituSSO)
	group.POST("/revoke", h.revokeChituSSO)
}

func decodeChituSSO(c *gin.Context, value any) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	d := json.NewDecoder(c.Request.Body)
	d.DisallowUnknownFields()
	if d.Decode(value) != nil || d.Decode(new(any)) != io.EOF {
		response.BadRequest(c, "invalid_request")
		return false
	}
	return true
}

func (h *AuthHandler) authorizeChituSSO(c *gin.Context) {
	var in struct {
		State     string `json:"state"`
		Challenge string `json:"code_challenge"`
	}
	if !decodeChituSSO(c, &in) {
		return
	}
	if !service.ValidChituSSOValue(in.State) {
		response.BadRequest(c, "invalid_state")
		return
	}
	parts := strings.Fields(c.GetHeader("Authorization"))
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		response.ErrorFrom(c, service.ErrInvalidToken)
		return
	}
	code, err := h.authService.AuthorizeChituSSO(c.Request.Context(), parts[1], in.Challenge)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	destination := strings.TrimRight(h.cfg.ChituSSOOrigin, "/") + "/api/v1/auth/mito/callback?" + url.Values{"state": {in.State}, "code": {code}}.Encode()
	response.Success(c, gin.H{"authorize_url": destination})
}
func (h *AuthHandler) exchangeChituSSO(c *gin.Context) {
	var in struct {
		Code     string `json:"code"`
		Verifier string `json:"code_verifier"`
		Proof    string `json:"session_proof"`
	}
	if !decodeChituSSO(c, &in) {
		return
	}
	identity, err := h.authService.ExchangeChituSSO(c.Request.Context(), in.Code, in.Verifier, in.Proof)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, identity)
}
func (h *AuthHandler) introspectChituSSO(c *gin.Context) {
	var in struct {
		Proof string `json:"session_proof"`
	}
	if !decodeChituSSO(c, &in) {
		return
	}
	identity, err := h.authService.IntrospectChituSSO(c.Request.Context(), in.Proof)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, identity)
}
func (h *AuthHandler) revokeChituSSO(c *gin.Context) {
	var in struct {
		Proof string `json:"session_proof"`
	}
	if !decodeChituSSO(c, &in) {
		return
	}
	if err := h.authService.RevokeChituSSO(c.Request.Context(), in.Proof); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"revoked": true})
}

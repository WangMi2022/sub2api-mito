package middleware

import (
	"errors"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

func enforceTokenIdentity(c *gin.Context, auth *service.AuthService, claims *service.JWTClaims) bool {
	if err := auth.ValidateTokenIdentity(c.Request.Context(), claims); err != nil {
		if errors.Is(err, service.ErrServiceUnavailable) {
			AbortWithError(c, 503, "SERVICE_UNAVAILABLE", "Unable to verify login identity")
		} else {
			AbortWithError(c, 401, "TOKEN_REVOKED", "Login identity has been unbound")
		}
		return false
	}
	return true
}

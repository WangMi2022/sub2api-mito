package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/ent/authidentity"
)

type oidcSessionIdentityKey struct{}

// OIDCSessionCache associates IdP browser sessions with local refresh-token
// families and records immediate family revocation for stateless access JWTs.
// It is implemented by the persistent Redis refresh-token cache.
type OIDCSessionCache interface {
	BindOIDCSession(ctx context.Context, issuer, idpSessionID, familyID string, ttl time.Duration) error
	RevokeOIDCSession(ctx context.Context, issuer, idpSessionID string, revocationTTL time.Duration) (int, error)
	ConsumeOIDCLogoutAndRevoke(ctx context.Context, issuer, jti, idpSessionID string, logoutTokenTTL, revocationTTL time.Duration) (bool, int, error)
	RevokeSessionFamily(ctx context.Context, familyID string, revocationTTL time.Duration) error
	IsSessionFamilyRevoked(ctx context.Context, familyID string) (bool, error)
	ConsumeOIDCLogoutJTI(ctx context.Context, issuer, jti string, ttl time.Duration) (bool, error)
}

func withOIDCSessionIdentity(ctx context.Context, identityID int64) context.Context {
	return context.WithValue(ctx, oidcSessionIdentityKey{}, identityID)
}

func oidcSessionIdentity(ctx context.Context) int64 {
	id, _ := ctx.Value(oidcSessionIdentityKey{}).(int64)
	return id
}

// GenerateOAuthTokenPair binds OIDC sessions to the exact persisted identity.
// Deleting and recreating an issuer/subject produces a new ID, so old sessions
// cannot become valid again when the same identity is rebound.
func (s *AuthService) GenerateOAuthTokenPair(ctx context.Context, user *User, provider, providerKey, subject string) (*TokenPair, error) {
	if !strings.EqualFold(strings.TrimSpace(provider), "oidc") {
		return s.GenerateTokenPair(ctx, user, "")
	}
	if s.entClient == nil || user == nil {
		return nil, ErrServiceUnavailable
	}
	identity, err := s.entClient.AuthIdentity.Query().Where(
		authidentity.UserIDEQ(user.ID), authidentity.ProviderTypeEQ("oidc"),
		authidentity.ProviderKeyEQ(strings.TrimSpace(providerKey)),
		authidentity.ProviderSubjectEQ(strings.TrimSpace(subject)),
	).Only(ctx)
	if err != nil {
		return nil, ErrServiceUnavailable
	}
	return s.GenerateTokenPair(withOIDCSessionIdentity(ctx, identity.ID), user, "")
}

// ValidateTokenIdentity checks live binding state without a cache. A failed
// refresh-cache cleanup must not keep an unbound OIDC access token usable.
// Legacy/password tokens have no identity reference and retain their behavior.
func (s *AuthService) ValidateTokenIdentity(ctx context.Context, claims *JWTClaims) error {
	if claims == nil {
		return ErrInvalidToken
	}
	if claims.AuthIdentityID == 0 {
		return nil
	}
	if claims.AuthIdentityID < 0 || claims.UserID <= 0 {
		return ErrTokenRevoked
	}
	if s.entClient == nil {
		return ErrServiceUnavailable
	}
	exists, err := s.entClient.AuthIdentity.Query().Where(
		authidentity.IDEQ(claims.AuthIdentityID), authidentity.UserIDEQ(claims.UserID), authidentity.ProviderTypeEQ("oidc"),
	).Exist(ctx)
	if err != nil {
		return ErrServiceUnavailable
	}
	if !exists {
		return ErrTokenRevoked
	}
	if claims.SessionID != "" {
		if cache, ok := s.refreshTokenCache.(OIDCSessionCache); ok {
			revoked, err := cache.IsSessionFamilyRevoked(ctx, claims.SessionID)
			if err != nil {
				return ErrServiceUnavailable
			}
			if revoked {
				return ErrTokenRevoked
			}
		}
	}
	return nil
}

// BindOIDCSessionPair records which local token family belongs to the IdP
// browser session. The mapping uses the family carried by the access token so
// access-token revocation survives refresh-token rotation.
func (s *AuthService) BindOIDCSessionPair(ctx context.Context, pair *TokenPair, issuer, idpSessionID string) error {
	if pair == nil || strings.TrimSpace(pair.AccessToken) == "" {
		return ErrInvalidToken
	}
	claims, err := s.ValidateToken(pair.AccessToken)
	if err != nil || claims == nil || strings.TrimSpace(claims.SessionID) == "" {
		return ErrInvalidToken
	}
	cache, ok := s.refreshTokenCache.(OIDCSessionCache)
	if !ok {
		return ErrServiceUnavailable
	}
	if strings.TrimSpace(issuer) == "" || strings.TrimSpace(idpSessionID) == "" {
		return ErrInvalidToken
	}
	if err := cache.BindOIDCSession(ctx, issuer, idpSessionID, claims.SessionID, s.sessionRevocationTTL()); err != nil {
		if errors.Is(err, ErrTokenRevoked) {
			return ErrTokenRevoked
		}
		return ErrServiceUnavailable
	}
	return nil
}

// ConsumeOIDCLogoutJTI records a verified logout token identifier exactly once.
// False means another request already consumed the identifier.
func (s *AuthService) ConsumeOIDCLogoutJTI(ctx context.Context, issuer, jti string, ttl time.Duration) (bool, error) {
	cache, ok := s.refreshTokenCache.(OIDCSessionCache)
	if !ok {
		return false, ErrServiceUnavailable
	}
	if strings.TrimSpace(issuer) == "" || strings.TrimSpace(jti) == "" || ttl <= 0 {
		return false, ErrInvalidToken
	}
	consumed, err := cache.ConsumeOIDCLogoutJTI(ctx, issuer, jti, ttl)
	if err != nil {
		return false, ErrServiceUnavailable
	}
	return consumed, nil
}

// ConsumeOIDCLogoutAndRevoke consumes the Logout Token identifier and revokes
// every family bound to its IdP session in one Redis script. Keeping replay
// protection and revocation atomic prevents a transient command failure from
// acknowledging a logout without applying it.
func (s *AuthService) ConsumeOIDCLogoutAndRevoke(ctx context.Context, issuer, jti, idpSessionID string, logoutTokenTTL time.Duration) (bool, int, error) {
	cache, ok := s.refreshTokenCache.(OIDCSessionCache)
	if !ok {
		return false, 0, ErrServiceUnavailable
	}
	if strings.TrimSpace(issuer) == "" || strings.TrimSpace(jti) == "" || strings.TrimSpace(idpSessionID) == "" || logoutTokenTTL <= 0 {
		return false, 0, ErrInvalidToken
	}
	consumed, revoked, err := cache.ConsumeOIDCLogoutAndRevoke(ctx, issuer, jti, idpSessionID, logoutTokenTTL, s.sessionRevocationTTL())
	if err != nil {
		return false, 0, ErrServiceUnavailable
	}
	return consumed, revoked, nil
}

// RevokeOIDCSession revokes every local family recorded for the IdP sid. It is
// idempotent: a repeated valid logout token finds no mappings and succeeds.
func (s *AuthService) RevokeOIDCSession(ctx context.Context, issuer, idpSessionID string) (int, error) {
	cache, ok := s.refreshTokenCache.(OIDCSessionCache)
	if !ok {
		return 0, ErrServiceUnavailable
	}
	if strings.TrimSpace(issuer) == "" || strings.TrimSpace(idpSessionID) == "" {
		return 0, ErrInvalidToken
	}
	revoked, err := cache.RevokeOIDCSession(ctx, issuer, idpSessionID, s.sessionRevocationTTL())
	if err != nil {
		return 0, ErrServiceUnavailable
	}
	return revoked, nil
}

func (s *AuthService) sessionRevocationTTL() time.Duration {
	days := 30
	if s != nil && s.cfg != nil && s.cfg.JWT.RefreshTokenExpireDays > 0 {
		days = s.cfg.JWT.RefreshTokenExpireDays
	}
	return time.Duration(days) * 24 * time.Hour
}

package service

import (
	"context"
	"strings"

	"github.com/Wei-Shaw/sub2api/ent/authidentity"
)

type oidcSessionIdentityKey struct{}

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
	return nil
}

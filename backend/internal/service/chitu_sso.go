package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/authidentity"
)

const ChituSSOLifetime = 8 * time.Hour

// ChituSSORecord contains only local session metadata, never access/refresh tokens.
type ChituSSORecord struct {
	UserID          int64     `json:"user_id"`
	TokenVersion    int64     `json:"token_version"`
	AuthIdentityID  int64     `json:"auth_identity_id"`
	FamilyID        string    `json:"family_id"`
	AccessExpiresAt time.Time `json:"access_expires_at"`
	ExpiresAt       time.Time `json:"expires_at"`
	Challenge       string    `json:"challenge,omitempty"`
}

// ChituSSOCache is optional: unconfigured/official instances cannot issue SSO.
type ChituSSOCache interface {
	StoreChituSSO(context.Context, string, string, *ChituSSORecord, time.Duration) error
	LoadChituSSO(context.Context, string, string, bool) (*ChituSSORecord, error)
}

type ChituSSOIdentity struct {
	Issuer    string `json:"issuer"`
	Subject   string `json:"subject"`
	ExpiresAt int64  `json:"expires_at"`
}

func ValidChituSSOValue(value string) bool {
	if len(value) != 64 {
		return false
	}
	_, err := hex.DecodeString(value)
	return err == nil
}

func (s *AuthService) chituSSOCache() (ChituSSOCache, error) {
	if s.cfg == nil || s.cfg.ChituSSOOrigin == "" {
		return nil, ErrServiceUnavailable
	}
	c, ok := s.refreshTokenCache.(ChituSSOCache)
	if !ok {
		return nil, ErrServiceUnavailable
	}
	if _, ok := s.refreshTokenCache.(OIDCSessionCache); !ok {
		return nil, ErrServiceUnavailable
	}
	return c, nil
}

// AuthorizeChituSSO requires the same live identity/family used by Mito requests.
// The browser presents the JWT in an authenticated POST; only a one-use code
// crosses products, bound to Chitu's server-held PKCE verifier.
func (s *AuthService) AuthorizeChituSSO(ctx context.Context, raw, challenge string) (string, error) {
	cache, err := s.chituSSOCache()
	if err != nil {
		return "", err
	}
	decoded, err := base64.RawURLEncoding.DecodeString(challenge)
	if err != nil || len(decoded) != sha256.Size {
		return "", ErrInvalidToken
	}
	claims, err := s.ValidateToken(raw)
	if err != nil {
		return "", err
	}
	if claims.ExpiresAt == nil || claims.SessionID == "" {
		return "", ErrInvalidToken
	}
	data := &ChituSSORecord{UserID: claims.UserID, TokenVersion: claims.TokenVersion, AuthIdentityID: claims.AuthIdentityID, FamilyID: claims.SessionID, AccessExpiresAt: claims.ExpiresAt.Time, ExpiresAt: time.Now().Add(ChituSSOLifetime), Challenge: challenge}
	if _, err = s.liveChituSSO(ctx, data); err != nil {
		return "", err
	}
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", ErrServiceUnavailable
	}
	code := hex.EncodeToString(b)
	if err = cache.StoreChituSSO(ctx, "code", hashToken(code), data, time.Minute); err != nil {
		return "", ErrServiceUnavailable
	}
	return code, nil
}

func (s *AuthService) ExchangeChituSSO(ctx context.Context, code, verifier, proof string) (*ChituSSOIdentity, error) {
	cache, err := s.chituSSOCache()
	if err != nil {
		return nil, err
	}
	if !ValidChituSSOValue(code) || !ValidChituSSOValue(proof) || len(verifier) < 43 || len(verifier) > 128 {
		return nil, ErrInvalidToken
	}
	data, err := cache.LoadChituSSO(ctx, "code", hashToken(code), true)
	if err != nil {
		return nil, chituSSOCacheError(err)
	}
	sum := sha256.Sum256([]byte(verifier))
	if subtle.ConstantTimeCompare([]byte(data.Challenge), []byte(base64.RawURLEncoding.EncodeToString(sum[:]))) != 1 {
		return nil, ErrInvalidToken
	}
	identity, err := s.liveChituSSO(ctx, data)
	if err != nil {
		return nil, err
	}
	data.Challenge = ""
	if err = cache.StoreChituSSO(ctx, "session", hashToken(proof), data, time.Until(data.ExpiresAt)); err != nil {
		return nil, ErrServiceUnavailable
	}
	return identity, nil
}

func (s *AuthService) IntrospectChituSSO(ctx context.Context, proof string) (*ChituSSOIdentity, error) {
	data, err := s.chituSSOSession(ctx, proof)
	if err != nil {
		return nil, err
	}
	return s.liveChituSSO(ctx, data)
}

func (s *AuthService) RevokeChituSSO(ctx context.Context, proof string) error {
	data, err := s.chituSSOSession(ctx, proof)
	if err != nil {
		return err
	}
	return s.RevokeSessionFamily(ctx, data.FamilyID)
}

func (s *AuthService) chituSSOSession(ctx context.Context, proof string) (*ChituSSORecord, error) {
	cache, err := s.chituSSOCache()
	if err != nil {
		return nil, err
	}
	if !ValidChituSSOValue(proof) {
		return nil, ErrInvalidToken
	}
	data, err := cache.LoadChituSSO(ctx, "session", hashToken(proof), false)
	if err != nil {
		return nil, chituSSOCacheError(err)
	}
	return data, nil
}

func chituSSOCacheError(err error) error {
	if errors.Is(err, ErrRefreshTokenNotFound) {
		return ErrTokenRevoked
	}
	return ErrServiceUnavailable
}

func (s *AuthService) liveChituSSO(ctx context.Context, data *ChituSSORecord) (*ChituSSOIdentity, error) {
	if data == nil || !time.Now().Before(data.ExpiresAt) || data.FamilyID == "" {
		return nil, ErrTokenRevoked
	}
	claims := &JWTClaims{UserID: data.UserID, AuthIdentityID: data.AuthIdentityID, SessionID: data.FamilyID}
	if err := s.ValidateTokenIdentity(ctx, claims); err != nil {
		return nil, err
	}
	if err := s.RequireUnifiedIdentity(ctx, claims); err != nil {
		return nil, err
	}
	user, err := s.userRepo.GetByID(ctx, data.UserID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, ErrTokenRevoked
		}
		return nil, ErrServiceUnavailable
	}
	if !user.IsActive() || resolvedTokenVersion(user) != data.TokenVersion {
		return nil, ErrTokenRevoked
	}
	// After the original access token expires, local refresh rotation may keep
	// the same family alive. Never require a still-live IdP browser cookie.
	if !time.Now().Before(data.AccessExpiresAt) {
		hashes, err := s.refreshTokenCache.GetFamilyTokenHashes(ctx, data.FamilyID)
		if err != nil {
			return nil, ErrServiceUnavailable
		}
		live := false
		for _, h := range hashes {
			v, err := s.refreshTokenCache.GetRefreshToken(ctx, h)
			if errors.Is(err, ErrRefreshTokenNotFound) {
				continue
			}
			if err != nil {
				return nil, ErrServiceUnavailable
			}
			if v.UserID == data.UserID && v.AuthIdentityID == data.AuthIdentityID && v.TokenVersion == data.TokenVersion && v.FamilyID == data.FamilyID && time.Now().Before(v.ExpiresAt) {
				live = true
				break
			}
		}
		if !live {
			return nil, ErrTokenRevoked
		}
	}
	identity, err := s.entClient.AuthIdentity.Query().Where(authidentity.IDEQ(data.AuthIdentityID), authidentity.UserIDEQ(data.UserID)).Only(ctx)
	if dbent.IsNotFound(err) {
		return nil, ErrTokenRevoked
	}
	if err != nil {
		return nil, ErrServiceUnavailable
	}
	return &ChituSSOIdentity{Issuer: identity.ProviderKey, Subject: identity.ProviderSubject, ExpiresAt: data.ExpiresAt.Unix()}, nil
}

//go:build unit

package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func TestOIDCSessionRevocationIsAtomicWithLateBinding(t *testing.T) {
	server := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: server.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	cache := NewRefreshTokenCache(rdb).(*refreshTokenCache)
	ctx := context.Background()
	ttl := 24 * time.Hour

	for _, familyID := range []string{"family-one", "family-two"} {
		require.NoError(t, cache.BindOIDCSession(ctx, "https://issuer.example", "idp-session", familyID, ttl))
		require.NoError(t, cache.AddToFamilyTokenSet(ctx, familyID, "hash-"+familyID, ttl))
		require.NoError(t, cache.StoreRefreshToken(ctx, "hash-"+familyID, &service.RefreshTokenData{FamilyID: familyID}, ttl))
	}
	require.NoError(t, cache.BindOIDCSession(ctx, "https://issuer.example", "other-session", "family-other", ttl))

	revoked, err := cache.RevokeOIDCSession(ctx, "https://issuer.example", "idp-session", ttl)
	require.NoError(t, err)
	require.Equal(t, 2, revoked)
	for _, familyID := range []string{"family-one", "family-two"} {
		value, err := cache.IsSessionFamilyRevoked(ctx, familyID)
		require.NoError(t, err)
		require.True(t, value)
		_, err = cache.GetRefreshToken(ctx, "hash-"+familyID)
		require.ErrorIs(t, err, service.ErrRefreshTokenNotFound)
	}
	value, err := cache.IsSessionFamilyRevoked(ctx, "family-other")
	require.NoError(t, err)
	require.False(t, value)

	err = cache.BindOIDCSession(ctx, "https://issuer.example", "idp-session", "late-family", ttl)
	require.ErrorIs(t, err, service.ErrTokenRevoked)
	value, err = cache.IsSessionFamilyRevoked(ctx, "late-family")
	require.NoError(t, err)
	require.False(t, value)
}

func TestOIDCLogoutJTIIsConsumedOnce(t *testing.T) {
	server := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: server.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	cache := NewRefreshTokenCache(rdb).(*refreshTokenCache)
	ctx := context.Background()
	ttl := 5 * time.Minute

	consumed, err := cache.ConsumeOIDCLogoutJTI(ctx, "https://issuer.example", "logout-jti", ttl)
	require.NoError(t, err)
	require.True(t, consumed)
	consumed, err = cache.ConsumeOIDCLogoutJTI(ctx, "https://issuer.example", "logout-jti", ttl)
	require.NoError(t, err)
	require.False(t, consumed)

	consumed, err = cache.ConsumeOIDCLogoutJTI(ctx, "https://other-issuer.example", "logout-jti", ttl)
	require.NoError(t, err)
	require.True(t, consumed)

	_, err = cache.ConsumeOIDCLogoutJTI(ctx, "", "logout-jti", ttl)
	require.Error(t, err)
	require.False(t, errors.Is(err, service.ErrTokenRevoked))
}

func TestOIDCLogoutConsumptionAndRevocationAreAtomicAndReplaySafe(t *testing.T) {
	server := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: server.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	cache := NewRefreshTokenCache(rdb).(*refreshTokenCache)
	ctx := context.Background()
	logoutTTL := 5 * time.Minute
	revocationTTL := 24 * time.Hour

	for _, familyID := range []string{"family-one", "family-two"} {
		require.NoError(t, cache.BindOIDCSession(ctx, "https://issuer.example", "idp-session", familyID, revocationTTL))
		require.NoError(t, cache.AddToFamilyTokenSet(ctx, familyID, "hash-"+familyID, revocationTTL))
		require.NoError(t, cache.StoreRefreshToken(ctx, "hash-"+familyID, &service.RefreshTokenData{FamilyID: familyID}, revocationTTL))
	}
	require.NoError(t, cache.BindOIDCSession(ctx, "https://issuer.example", "other-session", "family-other", revocationTTL))

	consumed, revoked, err := cache.ConsumeOIDCLogoutAndRevoke(ctx, "https://issuer.example", "logout-jti", "idp-session", logoutTTL, revocationTTL)
	require.NoError(t, err)
	require.True(t, consumed)
	require.Equal(t, 2, revoked)
	for _, familyID := range []string{"family-one", "family-two"} {
		value, err := cache.IsSessionFamilyRevoked(ctx, familyID)
		require.NoError(t, err)
		require.True(t, value)
		_, err = cache.GetRefreshToken(ctx, "hash-"+familyID)
		require.ErrorIs(t, err, service.ErrRefreshTokenNotFound)
	}
	value, err := cache.IsSessionFamilyRevoked(ctx, "family-other")
	require.NoError(t, err)
	require.False(t, value)

	consumed, revoked, err = cache.ConsumeOIDCLogoutAndRevoke(ctx, "https://issuer.example", "logout-jti", "other-session", logoutTTL, revocationTTL)
	require.NoError(t, err)
	require.False(t, consumed)
	require.Zero(t, revoked)
	value, err = cache.IsSessionFamilyRevoked(ctx, "family-other")
	require.NoError(t, err)
	require.False(t, value)
}

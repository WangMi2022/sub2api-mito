package repository

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/redis/go-redis/v9"
)

// consumeRefreshTokenScript atomically reads and deletes a refresh token.
// Rotation must only succeed for one concurrent caller, otherwise the same
// token can be exchanged twice (double-spend).
var consumeRefreshTokenScript = redis.NewScript(`
	local value = redis.call('GET', KEYS[1])
	if not value then
		return nil
	end
	redis.call('DEL', KEYS[1])
	return value
`)

const (
	refreshTokenKeyPrefix    = "refresh_token:"
	userRefreshTokensPrefix  = "user_refresh_tokens:"
	tokenFamilyPrefix        = "token_family:"
	oidcSessionFamilyPrefix  = "oidc_session_family:"
	oidcSessionRevokedPrefix = "oidc_session_revoked:"
	oidcFamilyRevokedPrefix  = "oidc_family_revoked:"
	oidcLogoutJTIPrefix      = "oidc_logout_jti:"
)

// refreshTokenKey generates the Redis key for a refresh token.
func refreshTokenKey(tokenHash string) string {
	return refreshTokenKeyPrefix + tokenHash
}

// userRefreshTokensKey generates the Redis key for user's token set.
func userRefreshTokensKey(userID int64) string {
	return fmt.Sprintf("%s%d", userRefreshTokensPrefix, userID)
}

// tokenFamilyKey generates the Redis key for token family set.
func tokenFamilyKey(familyID string) string {
	return tokenFamilyPrefix + familyID
}

func oidcSessionFamilyKey(issuer, idpSessionID string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(issuer) + "\x00" + strings.TrimSpace(idpSessionID)))
	return fmt.Sprintf("%s%x", oidcSessionFamilyPrefix, sum[:])
}

func oidcFamilyRevokedKey(familyID string) string {
	return oidcFamilyRevokedPrefix + familyID
}

func oidcSessionRevokedKey(issuer, idpSessionID string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(issuer) + "\x00" + strings.TrimSpace(idpSessionID)))
	return fmt.Sprintf("%s%x", oidcSessionRevokedPrefix, sum[:])
}

func oidcLogoutJTIKey(issuer, jti string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(issuer) + "\x00" + strings.TrimSpace(jti)))
	return fmt.Sprintf("%s%x", oidcLogoutJTIPrefix, sum[:])
}

type refreshTokenCache struct {
	rdb *redis.Client
}

// NewRefreshTokenCache creates a new RefreshTokenCache implementation.
func NewRefreshTokenCache(rdb *redis.Client) service.RefreshTokenCache {
	return &refreshTokenCache{rdb: rdb}
}

func (c *refreshTokenCache) StoreRefreshToken(ctx context.Context, tokenHash string, data *service.RefreshTokenData, ttl time.Duration) error {
	key := refreshTokenKey(tokenHash)
	val, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshal refresh token data: %w", err)
	}
	return c.rdb.Set(ctx, key, val, ttl).Err()
}

func (c *refreshTokenCache) GetRefreshToken(ctx context.Context, tokenHash string) (*service.RefreshTokenData, error) {
	key := refreshTokenKey(tokenHash)
	val, err := c.rdb.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, service.ErrRefreshTokenNotFound
		}
		return nil, err
	}
	var data service.RefreshTokenData
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, fmt.Errorf("unmarshal refresh token data: %w", err)
	}
	return &data, nil
}

func (c *refreshTokenCache) DeleteRefreshToken(ctx context.Context, tokenHash string) error {
	key := refreshTokenKey(tokenHash)
	return c.rdb.Del(ctx, key).Err()
}

func (c *refreshTokenCache) ConsumeRefreshToken(ctx context.Context, tokenHash string) (*service.RefreshTokenData, error) {
	val, err := consumeRefreshTokenScript.Run(ctx, c.rdb, []string{refreshTokenKey(tokenHash)}).Text()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, service.ErrRefreshTokenNotFound
		}
		return nil, err
	}
	var data service.RefreshTokenData
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, fmt.Errorf("unmarshal refresh token data: %w", err)
	}
	return &data, nil
}

func (c *refreshTokenCache) DeleteUserRefreshTokens(ctx context.Context, userID int64) error {
	// Get all token hashes for this user
	tokenHashes, err := c.GetUserTokenHashes(ctx, userID)
	if err != nil && err != redis.Nil {
		return fmt.Errorf("get user token hashes: %w", err)
	}

	if len(tokenHashes) == 0 {
		return nil
	}

	// Build keys to delete
	keys := make([]string, 0, len(tokenHashes)+1)
	for _, hash := range tokenHashes {
		keys = append(keys, refreshTokenKey(hash))
	}
	keys = append(keys, userRefreshTokensKey(userID))

	// Delete all keys in a pipeline
	pipe := c.rdb.Pipeline()
	for _, key := range keys {
		pipe.Del(ctx, key)
	}
	_, err = pipe.Exec(ctx)
	return err
}

func (c *refreshTokenCache) DeleteTokenFamily(ctx context.Context, familyID string) error {
	// Get all token hashes in this family
	tokenHashes, err := c.GetFamilyTokenHashes(ctx, familyID)
	if err != nil && err != redis.Nil {
		return fmt.Errorf("get family token hashes: %w", err)
	}

	if len(tokenHashes) == 0 {
		return nil
	}

	// Build keys to delete
	keys := make([]string, 0, len(tokenHashes)+1)
	for _, hash := range tokenHashes {
		keys = append(keys, refreshTokenKey(hash))
	}
	keys = append(keys, tokenFamilyKey(familyID))

	// Delete all keys in a pipeline
	pipe := c.rdb.Pipeline()
	for _, key := range keys {
		pipe.Del(ctx, key)
	}
	_, err = pipe.Exec(ctx)
	return err
}

func (c *refreshTokenCache) AddToUserTokenSet(ctx context.Context, userID int64, tokenHash string, ttl time.Duration) error {
	key := userRefreshTokensKey(userID)
	pipe := c.rdb.Pipeline()
	pipe.SAdd(ctx, key, tokenHash)
	pipe.Expire(ctx, key, ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (c *refreshTokenCache) AddToFamilyTokenSet(ctx context.Context, familyID string, tokenHash string, ttl time.Duration) error {
	key := tokenFamilyKey(familyID)
	pipe := c.rdb.Pipeline()
	pipe.SAdd(ctx, key, tokenHash)
	pipe.Expire(ctx, key, ttl)
	_, err := pipe.Exec(ctx)
	return err
}

func (c *refreshTokenCache) GetUserTokenHashes(ctx context.Context, userID int64) ([]string, error) {
	key := userRefreshTokensKey(userID)
	return c.rdb.SMembers(ctx, key).Result()
}

func (c *refreshTokenCache) GetFamilyTokenHashes(ctx context.Context, familyID string) ([]string, error) {
	key := tokenFamilyKey(familyID)
	return c.rdb.SMembers(ctx, key).Result()
}

func (c *refreshTokenCache) IsTokenInFamily(ctx context.Context, familyID string, tokenHash string) (bool, error) {
	key := tokenFamilyKey(familyID)
	return c.rdb.SIsMember(ctx, key, tokenHash).Result()
}

func (c *refreshTokenCache) BindOIDCSession(ctx context.Context, issuer, idpSessionID, familyID string, ttl time.Duration) error {
	if strings.TrimSpace(issuer) == "" || strings.TrimSpace(idpSessionID) == "" || strings.TrimSpace(familyID) == "" || ttl <= 0 {
		return errors.New("invalid oidc session binding")
	}
	bindingKey := oidcSessionFamilyKey(issuer, idpSessionID)
	revokedKey := oidcSessionRevokedKey(issuer, idpSessionID)
	bound, err := redis.NewScript(`
		if redis.call('EXISTS', KEYS[2]) == 1 then
			return 0
		end
		redis.call('SADD', KEYS[1], ARGV[1])
		redis.call('EXPIRE', KEYS[1], ARGV[2])
		return 1
	`).Run(ctx, c.rdb, []string{bindingKey, revokedKey}, familyID, int64(ttl/time.Second)).Int()
	if err != nil {
		return err
	}
	if bound == 0 {
		return service.ErrTokenRevoked
	}
	return nil
}

var revokeOIDCSessionFamiliesScript = redis.NewScript(`
	local values = redis.call('SMEMBERS', KEYS[1])
	redis.call('DEL', KEYS[1])
	redis.call('SET', KEYS[2], '1', 'PX', ARGV[1])
	for _, familyID in ipairs(values) do
		redis.call('SET', ARGV[2] .. familyID, '1', 'PX', ARGV[1])
	end
	return values
`)

var consumeLogoutAndRevokeOIDCSessionScript = redis.NewScript(`
	if not redis.call('SET', KEYS[1], '1', 'PX', ARGV[1], 'NX') then
		return {0, 0}
	end
	local values = redis.call('SMEMBERS', KEYS[2])
	redis.call('DEL', KEYS[2])
	redis.call('SET', KEYS[3], '1', 'PX', ARGV[2])
	for _, familyID in ipairs(values) do
		redis.call('SET', ARGV[3] .. familyID, '1', 'PX', ARGV[2])
	end
	local result = {1, #values}
	for _, familyID in ipairs(values) do
		table.insert(result, familyID)
	end
	return result
`)

func (c *refreshTokenCache) RevokeOIDCSession(ctx context.Context, issuer, idpSessionID string, revocationTTL time.Duration) (int, error) {
	if strings.TrimSpace(issuer) == "" || strings.TrimSpace(idpSessionID) == "" || revocationTTL <= 0 {
		return 0, errors.New("invalid oidc session revocation")
	}
	values, err := revokeOIDCSessionFamiliesScript.Run(
		ctx,
		c.rdb,
		[]string{oidcSessionFamilyKey(issuer, idpSessionID), oidcSessionRevokedKey(issuer, idpSessionID)},
		revocationTTL.Milliseconds(),
		oidcFamilyRevokedPrefix,
	).StringSlice()
	if err != nil {
		return 0, err
	}
	for _, familyID := range values {
		if err := c.deleteRevokedSessionFamilyTokens(ctx, familyID); err != nil {
			return 0, err
		}
	}
	return len(values), nil
}

func (c *refreshTokenCache) ConsumeOIDCLogoutAndRevoke(ctx context.Context, issuer, jti, idpSessionID string, logoutTokenTTL, revocationTTL time.Duration) (bool, int, error) {
	if strings.TrimSpace(issuer) == "" || strings.TrimSpace(jti) == "" || strings.TrimSpace(idpSessionID) == "" || logoutTokenTTL <= 0 || revocationTTL <= 0 {
		return false, 0, errors.New("invalid oidc logout revocation")
	}
	values, err := consumeLogoutAndRevokeOIDCSessionScript.Run(
		ctx,
		c.rdb,
		[]string{
			oidcLogoutJTIKey(issuer, jti),
			oidcSessionFamilyKey(issuer, idpSessionID),
			oidcSessionRevokedKey(issuer, idpSessionID),
		},
		logoutTokenTTL.Milliseconds(),
		revocationTTL.Milliseconds(),
		oidcFamilyRevokedPrefix,
	).Slice()
	if err != nil {
		return false, 0, err
	}
	if len(values) < 2 {
		return false, 0, errors.New("invalid oidc logout result")
	}
	consumed, ok := values[0].(int64)
	if !ok || (consumed != 0 && consumed != 1) {
		return false, 0, errors.New("invalid oidc logout consumption result")
	}
	revoked, ok := values[1].(int64)
	if !ok || revoked < 0 {
		return false, 0, errors.New("invalid oidc logout revocation result")
	}
	if consumed == 0 {
		return false, 0, nil
	}
	for _, value := range values[2:] {
		familyID, ok := value.(string)
		if !ok {
			return true, 0, errors.New("invalid oidc logout family result")
		}
		if err := c.deleteRevokedSessionFamilyTokens(ctx, familyID); err != nil {
			return true, int(revoked), err
		}
	}
	return true, int(revoked), nil
}

func (c *refreshTokenCache) deleteRevokedSessionFamilyTokens(ctx context.Context, familyID string) error {
	tokenHashes, err := c.GetFamilyTokenHashes(ctx, familyID)
	if err != nil && !errors.Is(err, redis.Nil) {
		return fmt.Errorf("get family token hashes: %w", err)
	}
	pipe := c.rdb.TxPipeline()
	for _, hash := range tokenHashes {
		pipe.Del(ctx, refreshTokenKey(hash))
	}
	pipe.Del(ctx, tokenFamilyKey(familyID))
	_, err = pipe.Exec(ctx)
	return err
}

func (c *refreshTokenCache) RevokeSessionFamily(ctx context.Context, familyID string, revocationTTL time.Duration) error {
	if strings.TrimSpace(familyID) == "" || revocationTTL <= 0 {
		return errors.New("invalid token family revocation")
	}
	tokenHashes, err := c.GetFamilyTokenHashes(ctx, familyID)
	if err != nil && !errors.Is(err, redis.Nil) {
		return fmt.Errorf("get family token hashes: %w", err)
	}
	pipe := c.rdb.TxPipeline()
	pipe.Set(ctx, oidcFamilyRevokedKey(familyID), "1", revocationTTL)
	for _, hash := range tokenHashes {
		pipe.Del(ctx, refreshTokenKey(hash))
	}
	pipe.Del(ctx, tokenFamilyKey(familyID))
	_, err = pipe.Exec(ctx)
	return err
}

func (c *refreshTokenCache) IsSessionFamilyRevoked(ctx context.Context, familyID string) (bool, error) {
	if strings.TrimSpace(familyID) == "" {
		return false, nil
	}
	value, err := c.rdb.Exists(ctx, oidcFamilyRevokedKey(familyID)).Result()
	if err != nil {
		return false, err
	}
	return value > 0, nil
}

func (c *refreshTokenCache) ConsumeOIDCLogoutJTI(ctx context.Context, issuer, jti string, ttl time.Duration) (bool, error) {
	if strings.TrimSpace(issuer) == "" || strings.TrimSpace(jti) == "" || ttl <= 0 {
		return false, errors.New("invalid oidc logout token identifier")
	}
	return c.rdb.SetNX(ctx, oidcLogoutJTIKey(issuer, jti), "1", ttl).Result()
}

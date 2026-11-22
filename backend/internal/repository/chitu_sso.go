package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/redis/go-redis/v9"
)

func chituSSOKey(kind, key string) string { return "mito_chitu_sso:" + kind + ":" + key }

func (c *refreshTokenCache) StoreChituSSO(ctx context.Context, kind, key string, data *service.ChituSSORecord, ttl time.Duration) error {
	if (kind != "code" && kind != "session") || ttl <= 0 {
		return fmt.Errorf("invalid SSO cache entry")
	}
	body, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, chituSSOKey(kind, key), body, ttl).Err()
}

func (c *refreshTokenCache) LoadChituSSO(ctx context.Context, kind, key string, consume bool) (*service.ChituSSORecord, error) {
	if kind != "code" && kind != "session" {
		return nil, fmt.Errorf("invalid SSO cache entry")
	}
	var body string
	var err error
	if consume {
		body, err = consumeRefreshTokenScript.Run(ctx, c.rdb, []string{chituSSOKey(kind, key)}).Text()
	} else {
		body, err = c.rdb.Get(ctx, chituSSOKey(kind, key)).Result()
	}
	if errors.Is(err, redis.Nil) {
		return nil, service.ErrRefreshTokenNotFound
	}
	if err != nil {
		return nil, err
	}
	var data service.ChituSSORecord
	if err = json.Unmarshal([]byte(body), &data); err != nil {
		return nil, err
	}
	return &data, nil
}

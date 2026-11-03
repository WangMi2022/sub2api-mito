package repository

import (
	"context"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func TestProvideAPIKeyCacheIsolatesAuthSnapshotNamespace(t *testing.T) {
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { _ = client.Close() })

	upstream := NewAPIKeyCache(client)
	fork := ProvideAPIKeyCache(client, &config.Config{
		APIKeyAuth: config.APIKeyAuthCacheConfig{KeyPrefix: "apikey:auth:mito:"},
	})
	ctx := context.Background()
	entry := &service.APIKeyAuthCacheEntry{Snapshot: &service.APIKeyAuthSnapshot{Version: 31}}

	require.NoError(t, upstream.SetAuthCache(ctx, "hash", entry, time.Minute))
	require.True(t, server.Exists("apikey:auth:hash"))
	require.False(t, server.Exists("apikey:auth:mito:hash"))

	_, err := fork.GetAuthCache(ctx, "hash")
	require.ErrorIs(t, err, redis.Nil)

	require.NoError(t, fork.SetAuthCache(ctx, "hash", entry, time.Minute))
	require.True(t, server.Exists("apikey:auth:mito:hash"))

	require.NoError(t, fork.DeleteAuthCache(ctx, "hash"))
	require.True(t, server.Exists("apikey:auth:hash"), "deleting the fork entry must not evict the upstream entry")
}

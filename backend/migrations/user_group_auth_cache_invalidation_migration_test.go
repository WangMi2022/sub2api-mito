package migrations

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMigration326InvalidatesAuthCacheWhenUserGroupChanges(t *testing.T) {
	content, err := FS.ReadFile("326_user_group_auth_cache_invalidation.sql")
	require.NoError(t, err)

	sql := string(content)
	require.Contains(t, sql, "CREATE OR REPLACE FUNCTION enqueue_user_auth_cache_invalidation()")
	require.Contains(t, sql, "OLD.user_group_id IS NOT DISTINCT FROM NEW.user_group_id")
	require.Contains(t, sql, "INSERT INTO auth_cache_invalidation_outbox")
}

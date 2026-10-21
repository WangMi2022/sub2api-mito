//go:build unit

package service

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

func TestHomeBackgroundAppearanceStoredDefaults(t *testing.T) {
	for _, raw := range []string{"", "not-a-number", "-1", "101"} {
		repo := &settingGetAllRepoStub{values: map[string]string{
			SettingKeyHomeBackgroundBlur: raw, SettingKeyHomeBackgroundOverlay: raw,
		}}
		settings, err := NewSettingService(repo, &config.Config{}).GetAllSettings(context.Background())
		require.NoError(t, err)
		require.Equal(t, DefaultHomeBackgroundBlur, settings.HomeBackgroundBlur, "raw=%s", raw)
		require.Equal(t, DefaultHomeBackgroundOverlay, settings.HomeBackgroundOverlay, "raw=%s", raw)
		publicRepo := &settingPublicRepoStub{values: repo.values}
		public, err := NewSettingService(publicRepo, &config.Config{}).GetPublicSettings(context.Background())
		require.NoError(t, err)
		require.Equal(t, settings.HomeBackgroundBlur, public.HomeBackgroundBlur)
		require.Equal(t, settings.HomeBackgroundOverlay, public.HomeBackgroundOverlay)
	}
}

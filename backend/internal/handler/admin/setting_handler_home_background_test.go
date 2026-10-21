//go:build unit

package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func TestHomeBackgroundAppearanceRoundTrip(t *testing.T) {
	h, repo := newStepUpSwitchTestHandler(t, map[string]string{
		service.SettingKeyHomeBackgroundImage: "/public/home-background/example.png",
	})
	settings, err := h.settingService.GetAllSettings(context.Background())
	require.NoError(t, err)
	require.Equal(t, 0, settings.HomeBackgroundBlur)
	require.Equal(t, 100, settings.HomeBackgroundOverlay)

	rec := doUpdateSettings(t, h, map[string]any{"home_background_blur": 6, "home_background_overlay": 45}, nil)
	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, "6", repo.values[service.SettingKeyHomeBackgroundBlur])
	require.Equal(t, "45", repo.values[service.SettingKeyHomeBackgroundOverlay])
	var body struct {
		Data struct {
			Blur    int `json:"home_background_blur"`
			Overlay int `json:"home_background_overlay"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.Equal(t, 6, body.Data.Blur)
	require.Equal(t, 45, body.Data.Overlay)

	// An older client saving another setting must preserve the appearance.
	rec = doUpdateSettings(t, h, map[string]any{"site_subtitle": "Example gateway"}, nil)
	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, "6", repo.values[service.SettingKeyHomeBackgroundBlur])
	require.Equal(t, "45", repo.values[service.SettingKeyHomeBackgroundOverlay])
	require.Equal(t, "/public/home-background/example.png", repo.values[service.SettingKeyHomeBackgroundImage])

	public, err := h.settingService.GetPublicSettings(context.Background())
	require.NoError(t, err)
	require.Equal(t, 6, public.HomeBackgroundBlur)
	require.Equal(t, 45, public.HomeBackgroundOverlay)
	injected, err := h.settingService.GetPublicSettingsForInjection(context.Background())
	require.NoError(t, err)
	payload := injected.(*service.PublicSettingsInjectionPayload)
	require.Equal(t, 6, payload.HomeBackgroundBlur)
	require.Equal(t, 45, payload.HomeBackgroundOverlay)

	// Zero is a deliberate choice, including a fully transparent overlay.
	rec = doUpdateSettings(t, h, map[string]any{"home_background_blur": 0, "home_background_overlay": 0}, nil)
	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, "0", repo.values[service.SettingKeyHomeBackgroundBlur])
	require.Equal(t, "0", repo.values[service.SettingKeyHomeBackgroundOverlay])
}

func TestHomeBackgroundAppearanceRejectsInvalidValues(t *testing.T) {
	for _, payload := range []map[string]any{
		{"home_background_blur": -1}, {"home_background_blur": 21},
		{"home_background_overlay": -1}, {"home_background_overlay": 101},
		{"home_background_blur": 1.5}, {"home_background_overlay": "50"},
	} {
		h, repo := newStepUpSwitchTestHandler(t, map[string]string{
			service.SettingKeyHomeBackgroundBlur: "4", service.SettingKeyHomeBackgroundOverlay: "60",
		})
		rec := doUpdateSettings(t, h, payload, nil)
		require.Equal(t, http.StatusBadRequest, rec.Code, "payload=%v", payload)
		require.Equal(t, "4", repo.values[service.SettingKeyHomeBackgroundBlur])
		require.Equal(t, "60", repo.values[service.SettingKeyHomeBackgroundOverlay])
	}
}

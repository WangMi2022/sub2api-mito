//go:build unit

package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/handler/dto"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
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
	reloaded := readHomeBackgroundSettings(t, h)
	require.Equal(t, "/public/home-background/example.png", reloaded.HomeBackgroundImage)
	require.Equal(t, 6, reloaded.HomeBackgroundBlur)
	require.Equal(t, 45, reloaded.HomeBackgroundOverlay)

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

// Exercise the HTTP read path as well as the update response: reloading settings
// must retain the same background as the public homepage.
func readHomeBackgroundSettings(t *testing.T, h *SettingHandler) dto.SystemSettings {
	t.Helper()
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/settings", nil)
	h.GetSettings(c)
	require.Equal(t, http.StatusOK, rec.Code)
	var body struct {
		Data dto.SystemSettings `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	return body.Data
}

func TestHomeBackgroundSettingsGetMatchesPublic(t *testing.T) {
	for _, tc := range []struct {
		name    string
		stored  map[string]string
		image   string
		blur    int
		overlay int
	}{
		{name: "defaults", stored: map[string]string{}, overlay: 100},
		{name: "saved", stored: map[string]string{
			service.SettingKeyHomeBackgroundImage: "/public/home-background/example.png",
			service.SettingKeyHomeBackgroundBlur:  "6", service.SettingKeyHomeBackgroundOverlay: "45",
		}, image: "/public/home-background/example.png", blur: 6, overlay: 45},
		{name: "zero", stored: map[string]string{
			service.SettingKeyHomeBackgroundImage: "/public/home-background/example.png",
			service.SettingKeyHomeBackgroundBlur:  "0", service.SettingKeyHomeBackgroundOverlay: "0",
		}, image: "/public/home-background/example.png"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			h, _ := newStepUpSwitchTestHandler(t, tc.stored)
			settings := readHomeBackgroundSettings(t, h)
			require.Equal(t, tc.image, settings.HomeBackgroundImage)
			require.Equal(t, tc.blur, settings.HomeBackgroundBlur)
			require.Equal(t, tc.overlay, settings.HomeBackgroundOverlay)
			public, err := h.settingService.GetPublicSettings(context.Background())
			require.NoError(t, err)
			require.Equal(t, public.HomeBackgroundImage, settings.HomeBackgroundImage)
			require.Equal(t, public.HomeBackgroundBlur, settings.HomeBackgroundBlur)
			require.Equal(t, public.HomeBackgroundOverlay, settings.HomeBackgroundOverlay)
		})
	}
}

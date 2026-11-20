//go:build unit

package admin

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/handler/dto"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestCustomMenuLocalizedLabelsRoundTripThroughSettingsAPI(t *testing.T) {
	h, repo := newStepUpSwitchTestHandler(t, map[string]string{})

	items := []map[string]any{
		{"id": "help", "label_zh": "帮助中心", "label_en": "Help center", "url": "https://example.com/help", "visibility": "user"},
		{"id": "legacy", "label": "Legacy page", "url": "https://example.com/legacy", "visibility": "user"},
	}
	update := doUpdateSettings(t, h, map[string]any{"custom_menu_items": items}, nil)
	require.Equal(t, http.StatusOK, update.Code, update.Body.String())

	var stored []map[string]any
	require.NoError(t, json.Unmarshal([]byte(repo.values[service.SettingKeyCustomMenuItems]), &stored))
	require.Equal(t, "帮助中心", stored[0]["label_zh"])
	require.Equal(t, "Help center", stored[0]["label_en"])
	require.Equal(t, "帮助中心", stored[0]["label"])
	require.Equal(t, "Legacy page", stored[1]["label"])

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/settings", nil)
	h.GetSettings(c)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var response struct {
		Data struct {
			CustomMenuItems []map[string]any `json:"custom_menu_items"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	require.Len(t, response.Data.CustomMenuItems, 2)
	require.Equal(t, "帮助中心", response.Data.CustomMenuItems[0]["label_zh"])
	require.Equal(t, "Help center", response.Data.CustomMenuItems[0]["label_en"])
	require.Equal(t, "帮助中心", response.Data.CustomMenuItems[0]["label"])
	require.Equal(t, "Legacy page", response.Data.CustomMenuItems[1]["label"])
}

func TestCustomMenuLocalizedLabelsUseCharacterLimit(t *testing.T) {
	h, _ := newStepUpSwitchTestHandler(t, map[string]string{})
	menuItem := func(label string) []map[string]any {
		return []map[string]any{{
			"id": "help", "label_zh": label, "url": "https://example.com/help", "visibility": "user",
		}}
	}

	accepted := doUpdateSettings(t, h, map[string]any{"custom_menu_items": menuItem(strings.Repeat("界", 50))}, nil)
	require.Equal(t, http.StatusOK, accepted.Code, accepted.Body.String())

	rejected := doUpdateSettings(t, h, map[string]any{"custom_menu_items": menuItem(strings.Repeat("界", 51))}, nil)
	require.Equal(t, http.StatusBadRequest, rejected.Code, rejected.Body.String())
}

func TestCustomMenuOrdinaryVisibilityPersistsIndependentlyOfAdminPlacement(t *testing.T) {
	h, repo := newStepUpSwitchTestHandler(t, map[string]string{})
	items := []map[string]any{
		{"id": "shared", "label": "Shared", "url": "md:shared", "visibility": "admin", "parent_id": "/admin/channels", "user_visible": true},
		{"id": "private", "label": "Private", "url": "md:private", "visibility": "user", "user_visible": false},
		{"id": "legacy", "label": "Legacy", "url": "md:legacy", "visibility": "admin"},
	}
	rec := doUpdateSettings(t, h, map[string]any{"custom_menu_items": items}, nil)
	require.Equal(t, 200, rec.Code, rec.Body.String())
	var saved []map[string]any
	require.NoError(t, json.Unmarshal([]byte(repo.values[service.SettingKeyCustomMenuItems]), &saved))
	require.Equal(t, true, saved[0]["user_visible"])
	require.Equal(t, "/admin/channels", saved[0]["parent_id"])
	require.Equal(t, false, saved[1]["user_visible"])
	require.Equal(t, "user", saved[0]["visibility"])
	require.Equal(t, "admin", saved[0]["admin_placement"])
	require.Equal(t, "admin", saved[1]["visibility"])
	require.Equal(t, "user", saved[1]["admin_placement"])
	require.NotContains(t, saved[2], "user_visible")
	require.NotContains(t, saved[2], "admin_placement")
}

func TestCustomMenuExternalNavigationRoundTrip(t *testing.T) {
	h, repo := newStepUpSwitchTestHandler(t, map[string]string{})
	items := []map[string]any{
		{"id": "compute", "label": "Compute", "url": "https://example.com/compute", "visibility": "user", "open_in_new_tab": true},
		{"id": "legacy", "label": "Legacy", "url": "https://example.com/docs", "visibility": "user"},
	}
	rec := doUpdateSettings(t, h, map[string]any{"custom_menu_items": items}, nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	parsed := dto.ParseCustomMenuItems(repo.values[service.SettingKeyCustomMenuItems])
	require.Len(t, parsed, 2)
	require.True(t, parsed[0].OpenInNewTab)
	require.False(t, parsed[1].OpenInNewTab)
	visible := dto.ParseUserVisibleMenuItems(repo.values[service.SettingKeyCustomMenuItems])
	require.Len(t, visible, 2)
	require.True(t, visible[0].OpenInNewTab)
	body, err := json.Marshal(visible)
	require.NoError(t, err)
	require.Contains(t, string(body), `"open_in_new_tab":true`)
}

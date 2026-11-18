package service

import (
	"encoding/json"
	"testing"
)

func TestCustomMenuPublicSettingsRespectExplicitAudienceAndLegacyDefaults(t *testing.T) {
	raw := `[{"id":"shared-admin","visibility":"admin","user_visible":true,"parent_id":"/admin/channels"},{"id":"private-personal","visibility":"user","user_visible":false},{"id":"legacy-user","visibility":"user"},{"id":"legacy-admin","visibility":"admin"},{"id":"unknown","visibility":"unknown"}]`
	var items []map[string]any
	if err := json.Unmarshal(filterUserVisibleMenuItems(raw), &items); err != nil {
		t.Fatal(err)
	}
	if len(items) != 2 || items[0]["id"] != "shared-admin" || items[1]["id"] != "legacy-user" || items[0]["parent_id"] != "/admin/channels" {
		t.Fatal(items)
	}
}

package identityadmin

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestGroupAccessSupportsMembershipAndRevocation(t *testing.T) {
	granted := false
	joined := false
	loggedOut := false
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/admin/realms/test/groups/team":
			_ = json.NewEncoder(w).Encode(Group{ID: "team", Path: "/team", Attributes: map[string][]string{"mito.identity.managed": {"true"}}})
		case "/admin/realms/test/groups/team/role-mappings":
			roles := []Role{}
			if granted {
				roles = append(roles, Role{ID: "role-id", Name: "app-access-mito"})
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"realmMappings": roles})
		case "/admin/realms/test/groups/team/role-mappings/realm":
			granted = r.Method == "POST"
			w.WriteHeader(204)
		case "/admin/realms/test/roles/app-access-mito":
			_, _ = w.Write([]byte(`{"id":"role-id","name":"app-access-mito"}`))
		case "/admin/realms/test/groups/team/members":
			_, _ = w.Write([]byte(`[{"id":"person","username":"person","enabled":true}]`))
		case "/admin/realms/test/users/person":
			_, _ = w.Write([]byte(`{"id":"person","username":"person","enabled":true}`))
		case "/admin/realms/test/clients":
			_, _ = w.Write([]byte(`[{"id":"realm-management-id"}]`))
		case "/admin/realms/test/users/person/role-mappings/clients/realm-management-id/composite":
			_, _ = w.Write([]byte(`[]`))
		case "/admin/realms/test/users/person/groups/team":
			joined = r.Method == "PUT"
			w.WriteHeader(204)
		case "/admin/realms/test/users/person/logout":
			loggedOut = true
			w.WriteHeader(204)
		default:
			t.Errorf("unexpected operation %s %s", r.Method, r.URL.Path)
			w.WriteHeader(500)
		}
	})
	ctx := context.Background()
	if err := client.SetGroupAccess(ctx, "team", "mito", true); err != nil {
		t.Fatal(err)
	}
	if err := client.Membership(ctx, "person", "team", true); err != nil {
		t.Fatal("safe application role must not prevent membership", err)
	}
	if !joined || !granted {
		t.Fatal("group grant/membership not persisted")
	}
	if err := client.SetGroupAccess(ctx, "team", "mito", false); err != nil {
		t.Fatal(err)
	}
	if granted || !loggedOut {
		t.Fatal("revocation must remove role and end member sessions")
	}
}

func TestBulkMembershipValidatesAllTargetsAndReportsPartialFailure(t *testing.T) {
	writes := 0
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/admin/realms/test/groups/team":
			_, _ = w.Write([]byte(`{"id":"team","path":"/team","attributes":{"mito.identity.managed":["true"]}}`))
		case strings.HasSuffix(r.URL.Path, "/role-mappings"):
			_, _ = w.Write([]byte(`{}`))
		case strings.HasSuffix(r.URL.Path, "/clients"):
			_, _ = w.Write([]byte(`[{"id":"realm-management-id"}]`))
		case strings.HasSuffix(r.URL.Path, "/composite"):
			_, _ = w.Write([]byte(`[]`))
		case strings.HasSuffix(r.URL.Path, "/groups/team"):
			writes++
			if strings.Contains(r.URL.Path, "second") {
				w.WriteHeader(503)
			} else {
				w.WriteHeader(204)
			}
		case strings.Contains(r.URL.Path, "/users/"):
			id := strings.TrimPrefix(r.URL.Path, "/admin/realms/test/users/")
			_ = json.NewEncoder(w).Encode(User{ID: id})
		default:
			t.Fatal(r.URL.Path)
		}
	})
	ctx := context.Background()
	if _, err := client.BulkMembership(ctx, "team", []string{"first", "owner"}, true); err == nil || writes != 0 {
		t.Fatal("protected selection must abort before any mutation", err, writes)
	}
	result, err := client.BulkMembership(ctx, "team", []string{"first", "second"}, true)
	if err != nil || len(result.Changed) != 1 || result.Changed[0] != "first" || len(result.Failed) != 1 || result.Failed[0] != "second" {
		t.Fatal(result, err)
	}
	if _, err := client.BulkMembership(ctx, "team", []string{"first", "first"}, true); err == nil {
		t.Fatal("duplicate targets accepted")
	}
}

func TestSummaryAndUngroupedFilterUseRealMembership(t *testing.T) {
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/admin/realms/test/users":
			_, _ = w.Write([]byte(`[{"id":"one","username":"one","enabled":true},{"id":"two","username":"two","enabled":true},{"id":"svc","serviceAccountClientId":"svc"}]`))
		case strings.HasSuffix(r.URL.Path, "/users/one/groups"):
			_, _ = w.Write([]byte(`[{"id":"team"}]`))
		case strings.HasSuffix(r.URL.Path, "/users/two/groups"):
			_, _ = w.Write([]byte(`[]`))
		case strings.HasSuffix(r.URL.Path, "/clients"):
			_, _ = w.Write([]byte(`[{"id":"realm-management-id"}]`))
		case strings.HasSuffix(r.URL.Path, "/composite"):
			_, _ = w.Write([]byte(`[]`))
		default:
			t.Fatal(r.URL.Path)
		}
	})
	ctx := context.Background()
	s, err := client.Summary(ctx)
	if err != nil || s.Accounts != 2 || s.Grouped != 1 || s.Ungrouped != 1 {
		t.Fatal(s, err)
	}
	page, err := client.Users(ctx, UserFilter{Ungrouped: true})
	if err != nil || len(page.Users) != 1 || page.Users[0].ID != "two" {
		t.Fatal(page, err)
	}
	page, err = client.Users(ctx, UserFilter{Ungrouped: true, Search: "one"})
	if err != nil || len(page.Users) != 0 {
		t.Fatal(page, err)
	}
}

func TestSessionAdmissionCachesThenInvalidatesAndFailsClosed(t *testing.T) {
	enabled := true
	allowed := true
	unavailable := false
	reads := 0
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		if unavailable {
			w.WriteHeader(503)
			return
		}
		switch {
		case r.URL.Path == "/admin/realms/test":
			_, _ = w.Write([]byte(`{"id":"realm-id"}`))
		case r.URL.Path == "/admin/realms/test/users/person":
			reads++
			_ = json.NewEncoder(w).Encode(User{ID: "person", Enabled: enabled})
		case strings.Contains(r.URL.Path, "/role-mappings/realm"):
			if allowed {
				_, _ = w.Write([]byte(`[{"id":"role-id","name":"app-access-mito"}]`))
			} else {
				_, _ = w.Write([]byte(`[]`))
			}
		case r.Method == "PUT":
			w.WriteHeader(204)
		default:
			t.Fatal(r.URL.Path)
		}
	})
	ctx := context.Background()
	if err := client.CheckSessionAccess(ctx, "person", "mito"); err != nil {
		t.Fatal(err)
	}
	if err := client.CheckSessionAccess(ctx, "person", "mito"); err != nil || reads != 1 {
		t.Fatal("admission cache not used", err, reads)
	}
	allowed = false
	// A console mutation must invalidate even a previously cached grant.
	if err := client.request(ctx, "PUT", "/changed", map[string]bool{}, nil); err != nil {
		t.Fatal(err)
	}
	if err := client.CheckSessionAccess(ctx, "person", "mito"); err == nil {
		t.Fatal("revoked grant remained usable")
	}
	allowed = true
	client.invalidateSessionAccess()
	if err := client.CheckSessionAccess(ctx, "person", "mito"); err != nil {
		t.Fatal(err)
	}
	client.accessMu.Lock()
	item := client.accessCache["mito:person"]
	item.expires = time.Now().Add(-time.Second)
	client.accessCache["mito:person"] = item
	client.accessMu.Unlock()
	unavailable = true
	if err := client.CheckSessionAccess(ctx, "person", "mito"); err == nil {
		t.Fatal("expired grant used during outage")
	}
	unavailable = false
	enabled = false
	client.invalidateSessionAccess()
	if err := client.CheckSessionAccess(ctx, "person", "mito"); err == nil {
		t.Fatal("disabled identity accepted")
	}
}

func TestGroupAdoptionRejectsPrivilegesAndPreservesAttributes(t *testing.T) {
	for _, privileged := range []bool{false, true} {
		writes := 0
		client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
			switch {
			case r.URL.Path == "/admin/realms/test/groups/team" && r.Method == "GET":
				_, _ = w.Write([]byte(`{"id":"team","name":"team","path":"/team","attributes":{"existing":["keep"]}}`))
			case strings.HasSuffix(r.URL.Path, "/role-mappings"):
				if privileged {
					_, _ = w.Write([]byte(`{"realmMappings":[{"id":"admin-id","name":"realm-admin"}]}`))
				} else {
					_, _ = w.Write([]byte(`{}`))
				}
			case strings.HasSuffix(r.URL.Path, "/members"):
				_, _ = w.Write([]byte(`[]`))
			case r.Method == "PUT":
				writes++
				var body struct {
					Attributes map[string][]string `json:"attributes"`
				}
				_ = json.NewDecoder(r.Body).Decode(&body)
				if body.Attributes["existing"][0] != "keep" || body.Attributes["mito.identity.managed"][0] != "true" {
					t.Fatal("attributes overwritten")
				}
				w.WriteHeader(204)
			default:
				t.Fatal(r.URL.Path)
			}
		})
		err := client.AdoptGroup(context.Background(), "team")
		if privileged && (err == nil || writes != 0) {
			t.Fatal("privileged group adopted")
		}
		if !privileged && (err != nil || writes != 1) {
			t.Fatal(err, writes)
		}
	}
}

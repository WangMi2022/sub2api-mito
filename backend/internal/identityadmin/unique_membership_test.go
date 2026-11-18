package identityadmin

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"
	"strings"
	"sync"
	"testing"
)

func TestUniqueMembershipMovesAcrossSingleAndBulkEntrypoints(t *testing.T) {
	for _, bulk := range []bool{false, true} {
		t.Run(map[bool]string{false: "single", true: "bulk"}[bulk], func(t *testing.T) {
			client, state := uniqueMembershipFixture(t, []string{"old"}, "", "")
			var err error
			if bulk {
				result, e := client.BulkMembership(context.Background(), "new", []string{"person"}, true)
				err = e
				if len(result.Changed) != 1 || len(result.Failed) != 0 {
					t.Fatal(result)
				}
			} else {
				err = client.Membership(context.Background(), "person", "new", true)
			}
			if err != nil {
				t.Fatal(err)
			}
			if !slices.Equal(state.groups, []string{"new"}) || state.maxGroups > 1 || state.logouts != 1 {
				t.Fatal(state)
			}
			before := state.writes
			if err := client.Membership(context.Background(), "person", "new", true); err != nil {
				t.Fatal(err)
			}
			if state.writes != before {
				t.Fatal("retry must not rewrite a settled membership")
			}
		})
	}
}

func TestUniqueMembershipFailureRestoresOriginalAndProtectedGroupIsUntouched(t *testing.T) {
	client, state := uniqueMembershipFixture(t, []string{"old"}, "new", "")
	if err := client.Membership(context.Background(), "person", "new", true); err == nil {
		t.Fatal("upstream failure hidden")
	}
	if !slices.Equal(state.groups, []string{"old"}) || state.maxGroups > 1 {
		t.Fatal(state)
	}
	client, state = uniqueMembershipFixture(t, []string{"external"}, "", "external")
	if _, err := client.BulkMembership(context.Background(), "new", []string{"person"}, true); err == nil {
		t.Fatal("protected membership silently removed")
	}
	if state.writes != 0 || !slices.Equal(state.groups, []string{"external"}) {
		t.Fatal(state)
	}
}

func TestUniqueMembershipConcurrentSingleAndBulkStayUnique(t *testing.T) {
	client, state := uniqueMembershipFixture(t, nil, "", "")
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			group := "new"
			if i%2 == 0 {
				group = "old"
			}
			if i%3 == 0 {
				result, err := client.BulkMembership(context.Background(), group, []string{"person"}, true)
				if err != nil || len(result.Failed) != 0 {
					t.Errorf("bulk: %v %v", result, err)
				}
			} else if err := client.Membership(context.Background(), "person", group, true); err != nil {
				t.Error(err)
			}
		}(i)
	}
	wg.Wait()
	if len(state.groups) != 1 || state.maxGroups > 1 {
		t.Fatal(state)
	}
}

type membershipState struct {
	mu                         sync.Mutex
	groups                     []string
	maxGroups, writes, logouts int
}

func uniqueMembershipFixture(t *testing.T, initial []string, failAdd, protected string) (*Client, *membershipState) {
	state := &membershipState{groups: append([]string{}, initial...), maxGroups: len(initial)}
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		state.mu.Lock()
		defer state.mu.Unlock()
		path := strings.TrimPrefix(r.URL.Path, "/admin/realms/test")
		switch {
		case path == "/users/person":
			_ = json.NewEncoder(w).Encode(User{ID: "person", Username: "person"})
		case path == "/clients":
			_, _ = w.Write([]byte(`[{"id":"realm-management-id"}]`))
		case strings.HasSuffix(path, "/composite"):
			_, _ = w.Write([]byte(`[]`))
		case path == "/users/person/groups":
			groups := []Group{}
			for _, id := range state.groups {
				groups = append(groups, Group{ID: id})
			}
			_ = json.NewEncoder(w).Encode(groups)
		case strings.HasPrefix(path, "/groups/") && strings.HasSuffix(path, "/role-mappings"):
			_, _ = w.Write([]byte(`{}`))
		case strings.HasPrefix(path, "/groups/"):
			id := strings.TrimPrefix(path, "/groups/")
			attributes := map[string][]string{}
			if id != protected {
				attributes["mito.identity.managed"] = []string{"true"}
			}
			_ = json.NewEncoder(w).Encode(Group{ID: id, Path: "/" + id, Attributes: attributes})
		case strings.HasPrefix(path, "/users/person/groups/"):
			id := strings.TrimPrefix(path, "/users/person/groups/")
			state.writes++
			if r.Method == "PUT" && id == failAdd {
				w.WriteHeader(503)
				return
			}
			if r.Method == "PUT" {
				if !slices.Contains(state.groups, id) {
					state.groups = append(state.groups, id)
				}
			} else {
				state.groups = slices.DeleteFunc(state.groups, func(group string) bool { return group == id })
			}
			if len(state.groups) > state.maxGroups {
				state.maxGroups = len(state.groups)
			}
			w.WriteHeader(204)
		case path == "/users/person/logout":
			state.logouts++
			w.WriteHeader(204)
		default:
			t.Errorf("unexpected request: %s %s", r.Method, path)
			w.WriteHeader(500)
		}
	})
	return client, state
}

package identityadmin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/gin-gonic/gin"
)

func fixture(t *testing.T, handler http.HandlerFunc) *Client {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if strings.HasSuffix(r.URL.Path, "/token") {
			_, _ = w.Write([]byte(`{"access_token":"test-private-token","expires_in":300}`))
			return
		}
		handler(w, r)
	}))
	t.Cleanup(srv.Close)
	return &Client{cfg: Config{Origin: srv.URL, RealmName: "test", RealmID: "realm-id", AllowedUserIDs: []int64{7}, ProtectedSubjects: []string{"owner"}, Applications: []Application{{ClientID: "mito", Name: "Mito", AccessRole: "app-access-mito"}}}, http: srv.Client()}
}

func router(client *Client, userID int64) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	next := func(c *gin.Context) { c.Next() }
	auth := func(c *gin.Context) {
		if userID <= 0 {
			c.AbortWithStatus(401)
			return
		}
		c.Set(string(middleware.ContextKeyUser), middleware.AuthSubject{UserID: userID})
		c.Next()
	}
	Register(r.Group("/api/v1"), client, auth, next, next, next)
	return r
}
func perform(r http.Handler, method, path, body string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	return w
}

func TestAuthorizationPrecedesKeycloak(t *testing.T) {
	client := fixture(t, func(http.ResponseWriter, *http.Request) { t.Error("unauthorized call reached Keycloak") })
	for _, id := range []int64{0, 8} {
		for _, path := range []string{"/users", "/users/target", "/groups", "/overview"} {
			w := perform(router(client, id), "GET", "/api/v1/identity"+path, "")
			want := 403
			if id == 0 {
				want = 401
			}
			if w.Code != want {
				t.Fatalf("id=%d path=%s status=%d", id, path, w.Code)
			}
		}
		w := perform(router(client, id), "PUT", "/api/v1/identity/users/owner/password", `{"password":"do-not-log-this"}`)
		if w.Code < 400 {
			t.Fatal("unauthorized mutation accepted")
		}
	}
	w := perform(router(client, 8), "GET", "/api/v1/identity/capabilities", "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"manage":false`) {
		t.Fatal(w.Body.String())
	}
}

func TestRealmReplacementBlocksMutations(t *testing.T) {
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" || r.URL.Path != "/admin/realms/test" {
			t.Error("realm boundary bypassed")
		}
		_, _ = w.Write([]byte(`{"id":"replacement"}`))
	})
	w := perform(router(client, 7), "POST", "/api/v1/identity/users", `{}`)
	if w.Code != 503 || !strings.Contains(w.Body.String(), "identity_realm_changed") {
		t.Fatal(w.Body.String())
	}
}

func TestTypedRequestsRejectPrivilegeFields(t *testing.T) {
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/admin/realms/test" {
			t.Error("untyped request reached Keycloak")
		}
		_, _ = w.Write([]byte(`{"id":"realm-id"}`))
	})
	for _, body := range []string{`{"username":"person","realmRoles":["realm-admin"]}`, `{"password":"private-password","temporary":true}`, `{}` + `{}`, `{"password":"` + strings.Repeat("x", 9000) + `"}`} {
		w := perform(router(client, 7), "PUT", "/api/v1/identity/users/person/password", body)
		if w.Code != 400 || strings.Contains(w.Body.String(), "private-password") {
			t.Fatal(w.Body.String())
		}
	}
}

func TestPermanentPasswordAndLogoutOrder(t *testing.T) {
	var operations []string
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		operations = append(operations, r.Method+" "+r.URL.Path)
		switch {
		case strings.HasSuffix(r.URL.Path, "/users/person"):
			_, _ = w.Write([]byte(`{"id":"person","username":"person"}`))
		case strings.HasSuffix(r.URL.Path, "/clients"):
			_, _ = w.Write([]byte(`[{"id":"realm-management-id"}]`))
		case strings.HasSuffix(r.URL.Path, "/composite"):
			_, _ = w.Write([]byte(`[]`))
		case strings.HasSuffix(r.URL.Path, "/reset-password"):
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			if body["temporary"] != false || body["value"] != "test-password" {
				t.Error("password contract violated")
			}
			w.WriteHeader(204)
		case strings.HasSuffix(r.URL.Path, "/logout"):
			w.WriteHeader(204)
		default:
			t.Error("unexpected operation", r.URL.Path)
			w.WriteHeader(500)
		}
	})
	if err := client.ResetPassword(context.Background(), "person", "test-password"); err != nil {
		t.Fatal(err)
	}
	if !strings.HasSuffix(operations[len(operations)-1], "/logout") || !strings.HasSuffix(operations[len(operations)-2], "/reset-password") {
		t.Fatal(operations)
	}
}

func TestProtectedAccountsCannotBeChanged(t *testing.T) {
	for _, kind := range []string{"owner", "service", "realm-admin"} {
		t.Run(kind, func(t *testing.T) {
			client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
				if r.Method != "GET" {
					t.Error("protected account mutated")
				}
				switch {
				case strings.HasSuffix(r.URL.Path, "/users/"+kind):
					user := User{ID: kind, Username: kind}
					if kind == "service" {
						user.ServiceAccountClientID = "service-client"
					}
					_ = json.NewEncoder(w).Encode(user)
				case strings.HasSuffix(r.URL.Path, "/clients"):
					_, _ = w.Write([]byte(`[{"id":"realm-management-id"}]`))
				case strings.HasSuffix(r.URL.Path, "/composite"):
					_, _ = w.Write([]byte(`[{"name":"realm-admin"}]`))
				}
			})
			for _, mutate := range []func() error{
				func() error { return client.ResetPassword(context.Background(), kind, "test-password") },
				func() error { return client.DeleteUser(context.Background(), kind, kind) },
				func() error { return client.Logout(context.Background(), kind) },
				func() error { return client.Membership(context.Background(), kind, "group", true) },
				func() error { return client.SetAccess(context.Background(), kind, "mito", true) },
			} {
				if err := mutate(); err == nil || err.Error() != "identity_protected_account" {
					t.Fatal(err)
				}
			}
		})
	}
}

func TestGroupsCannotGrantInheritedPrivileges(t *testing.T) {
	for _, roles := range []string{`{"realmMappings":[{"name":"realm-admin"}]}`, `{"clientMappings":{"realm-management":{}}}`} {
		client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
			if r.Method != "GET" {
				t.Error("privileged group mutated")
			}
			if strings.HasSuffix(r.URL.Path, "/role-mappings") {
				_, _ = w.Write([]byte(roles))
				return
			}
			_, _ = w.Write([]byte(`{"id":"group","name":"group","path":"/group","attributes":{"mito.identity.managed":["true"]}}`))
		})
		if err := client.SaveGroup(context.Background(), "group", "renamed"); err == nil || err.Error() != "identity_protected_group" {
			t.Fatal(err)
		}
	}
}

func TestUpstreamSecretsDoNotEscape(t *testing.T) {
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(500)
		_, _ = w.Write([]byte(`{"secret":"never-echo-this"}`))
	})
	w := perform(router(client, 7), "GET", "/api/v1/identity/users", "")
	if w.Code != 503 || strings.Contains(w.Body.String(), "never-echo") || strings.Contains(w.Body.String(), "test-private-token") {
		t.Fatal(w.Body.String())
	}
}

func TestTokenCacheSupportsConcurrentReads(t *testing.T) {
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(`{"id":"realm-id"}`)) })
	var wg sync.WaitGroup
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := client.Realm(context.Background()); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
}

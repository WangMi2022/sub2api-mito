package identityadmin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

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
		c.Next()
	}
	Register(r.Group("/api/v1"), client, func(*gin.Context) int64 { return userID }, auth, next, next, next)
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
		for _, path := range []string{"/users", "/users/target", "/users/target/security", "/applications/mito/users", "/groups", "/groups/team/members", "/overview"} {
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
	for _, body := range []string{`{"username":"person","realmRoles":["realm-admin"]}`, `{"password":"private-password","temporary":"yes"}`, `{}` + `{}`, `{"password":"` + strings.Repeat("x", 9000) + `"}`} {
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
	if err := client.ResetPassword(context.Background(), "person", "test-password", false); err != nil {
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
				func() error { return client.ResetPassword(context.Background(), kind, "test-password", true) },
				func() error { return client.DeleteUser(context.Background(), kind, kind) },
				func() error { return client.Logout(context.Background(), kind) },
				func() error { return client.Membership(context.Background(), kind, "group", true) },
				func() error { return client.SetAccess(context.Background(), kind, "mito", true) },
				func() error { return client.SessionLogout(context.Background(), kind, "session-1") },
				func() error {
					return client.VerificationEmail(context.Background(), Realm{EmailDeliveryConfigured: true}, kind)
				},
				func() error {
					return client.ClearLoginFailures(context.Background(), Realm{LoginProtectionEnabled: true}, kind)
				},
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

func TestGroupMembersPaginationAndProtectedAccounts(t *testing.T) {
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/groups/team/members"):
			if r.URL.Query().Get("first") != "50" || r.URL.Query().Get("max") != "51" {
				t.Error("unbounded pagination")
			}
			users := make([]User, 51)
			for i := range users {
				users[i] = User{ID: "owner", Username: "owner"}
			}
			_ = json.NewEncoder(w).Encode(users)
		default:
			t.Error("unexpected directory request", r.URL.Path)
			w.WriteHeader(500)
		}
	})
	page, err := client.GroupMembers(context.Background(), "team", 50)
	if err != nil || !page.HasMore || len(page.Users) != 50 || !page.Users[0].Protected {
		t.Fatalf("invalid page: %+v, %v", page, err)
	}
	if _, err := client.GroupMembers(context.Background(), "../admin", 0); err == nil {
		t.Fatal("invalid group ID accepted")
	}
	if _, err := client.GroupMembers(context.Background(), "team", -1); err == nil {
		t.Fatal("invalid page accepted")
	}
}

func TestPolicyExtensionRequiresOwnerAndStepUpWithoutDirectoryAvailability(t *testing.T) {
	client := fixture(t, func(http.ResponseWriter, *http.Request) { t.Error("policy must not depend on Keycloak availability") })
	for _, owner := range []bool{false, true} {
		for _, steppedUp := range []bool{false, true} {
			r := gin.New()
			next := func(c *gin.Context) { c.Next() }
			step := func(c *gin.Context) {
				if !steppedUp {
					c.AbortWithStatus(403)
					return
				}
				c.Next()
			}
			Register(r.Group("/api/v1"), client, func(*gin.Context) int64 {
				if owner {
					return 7
				}
				return 8
			}, next, next, step, next,
				func(read, write *gin.RouterGroup) { write.PUT("/login-policy", func(c *gin.Context) { c.Status(204) }) })
			w := perform(r, "PUT", "/api/v1/identity/login-policy", `{}`)
			want := 403
			if owner && steppedUp {
				want = 204
			}
			if w.Code != want {
				t.Fatalf("owner=%v step-up=%v status=%d", owner, steppedUp, w.Code)
			}
		}
	}
}

func TestUsernameCanBeUpdatedAndEmailChangeInvalidatesVerification(t *testing.T) {
	var patch map[string]any
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/users/person") && r.Method == "GET":
			_ = json.NewEncoder(w).Encode(User{ID: "person", Username: "old", Email: "old@example.com", Enabled: true, EmailVerified: true})
		case strings.HasSuffix(r.URL.Path, "/clients"):
			_, _ = w.Write([]byte(`[{"id":"realm-management-id"}]`))
		case strings.HasSuffix(r.URL.Path, "/composite"):
			_, _ = w.Write([]byte(`[]`))
		case strings.HasSuffix(r.URL.Path, "/users/person") && r.Method == "PUT":
			_ = json.NewDecoder(r.Body).Decode(&patch)
			w.WriteHeader(204)
		default:
			t.Error("unexpected request", r.Method, r.URL.Path)
			w.WriteHeader(500)
		}
	})
	in := UserInput{Username: "new", Email: "new@example.com", FirstName: "New", LastName: "Person", Enabled: true}
	err := client.UpdateUser(context.Background(), Realm{}, "person", in)
	if err == nil || err.Error() != "identity_username_immutable" || patch != nil {
		t.Fatalf("realm username policy not enforced: %v", err)
	}
	err = client.UpdateUser(context.Background(), Realm{UsernameEditable: true}, "person", in)
	if err != nil {
		t.Fatal(err)
	}
	if patch["username"] != "new" || patch["emailVerified"] != false || patch["enabled"] != nil {
		t.Fatalf("unexpected patch: %#v", patch)
	}
}

func TestSessionLogoutRequiresOwnedOnlineSession(t *testing.T) {
	var removed []string
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/users/person") && r.Method == "GET":
			_, _ = w.Write([]byte(`{"id":"person","username":"person"}`))
		case strings.HasSuffix(r.URL.Path, "/clients"):
			_, _ = w.Write([]byte(`[{"id":"realm-management-id"}]`))
		case strings.HasSuffix(r.URL.Path, "/composite"):
			_, _ = w.Write([]byte(`[]`))
		case r.URL.Path == "/admin/realms/test/users/person/sessions" && r.Method == "GET":
			_, _ = w.Write([]byte(`[{"id":"device-one"},{"id":"device-two"}]`))
		case r.URL.Path == "/admin/realms/test/sessions/device-two" && r.Method == "DELETE":
			removed = append(removed, r.URL.Path)
			w.WriteHeader(204)
		default:
			t.Error("unexpected session request", r.Method, r.URL.Path)
			w.WriteHeader(500)
		}
	})
	if err := client.SessionLogout(context.Background(), "person", "different-account-session"); err == nil || err.Error() != "identity_session_not_found" {
		t.Fatalf("wrong session ownership result: %v", err)
	}
	if err := client.SessionLogout(context.Background(), "person", "device-two"); err != nil {
		t.Fatal(err)
	}
	if len(removed) != 1 {
		t.Fatal(removed)
	}
}

func TestCreateUserAcceptsTemporaryPasswordButNotVerifiedEmail(t *testing.T) {
	created := false
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && r.URL.Path == "/admin/realms/test" {
			_, _ = w.Write([]byte(`{"id":"realm-id"}`))
			return
		}
		if r.Method != "POST" || r.URL.Path != "/admin/realms/test/users" || created {
			t.Error("unexpected create request", r.Method, r.URL.Path)
			w.WriteHeader(500)
			return
		}
		var payload struct {
			EmailVerified *bool `json:"emailVerified"`
			Credentials   []struct {
				Temporary bool `json:"temporary"`
			} `json:"credentials"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.EmailVerified == nil || *payload.EmailVerified || len(payload.Credentials) != 1 || !payload.Credentials[0].Temporary {
			t.Error("unexpected verification or password policy on user creation")
		}
		created = true
		w.WriteHeader(201)
	})
	valid := `{"username":"person","email":"person@example.test","firstName":"First","lastName":"Last","enabled":true,"password":"test-password","temporaryPassword":true}`
	path := "/api/v1/identity/users"
	w := perform(router(client, 7), "POST", path, strings.TrimSuffix(valid, "}")+`,"emailVerified":true}`)
	if w.Code != 400 || created {
		t.Fatal("manual verification accepted")
	}
	w = perform(router(client, 7), "POST", path, valid)
	if w.Code != 200 || !created {
		t.Fatal(w.Body.String())
	}
}

func TestUserSecurityAndOverviewExposeOnlyDisplayFields(t *testing.T) {
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		var body string
		switch r.URL.Path {
		case "/admin/realms/test":
			body = `{"id":"realm-id","smtpServer":{"host":"mail.example.test","password":"private-smtp"},"bruteForceProtected":true,"editUsernameAllowed":true}`
		case "/admin/realms/test/users/person":
			body = `{"id":"person","username":"person"}`
		case "/admin/realms/test/users/person/credentials":
			body = `[{"type":"password","credentialData":"private-data"},{"type":"otp","secretData":"private-otp"},{"type":"otp"}]`
		case "/admin/realms/test/users/person/federated-identity":
			body = `[{"identityProvider":"external","userId":"private-subject","userName":"private-username"}]`
		case "/admin/realms/test/attack-detection/brute-force/users/person":
			body = `{"disabled":true,"numFailures":4,"lastFailure":100,"lastIPFailure":"private-ip"}`
		default:
			t.Error("unexpected security request", r.URL.Path)
			w.WriteHeader(500)
			return
		}
		_, _ = w.Write([]byte(body))
	})
	r := router(client, 7)
	w := perform(r, "GET", "/api/v1/identity/overview", "")
	if body := w.Body.String(); w.Code != 200 || !strings.Contains(body, `"emailDeliveryConfigured":true`) || strings.Contains(body, "private-") || strings.Contains(body, "mail.example.test") {
		t.Fatal("invalid realm overview")
	}
	w = perform(r, "GET", "/api/v1/identity/users/person/security", "")
	if body := w.Body.String(); w.Code != 200 || !strings.Contains(body, `"credentialTypes":["otp","password"]`) || !strings.Contains(body, `"numFailures":4`) || strings.Contains(body, "private-") {
		t.Fatal("invalid user security state")
	}
}

func TestUserSecurityWritesRequireStepUp(t *testing.T) {
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" || r.URL.Path != "/admin/realms/test" {
			t.Error("step-up denial reached a user operation")
		}
		_, _ = w.Write([]byte(`{"id":"realm-id"}`))
	})
	r := gin.New()
	next := func(c *gin.Context) { c.Next() }
	deny := func(c *gin.Context) { c.AbortWithStatus(403) }
	Register(r.Group("/api/v1"), client, func(*gin.Context) int64 { return 7 }, next, next, deny, next)
	for _, endpoint := range []struct{ method, path string }{
		{"POST", "/sessions/end"},
		{"DELETE", "/login-failures"},
		{"PUT", "/verify-email"},
		{"PUT", "/password"},
	} {
		if w := perform(r, endpoint.method, "/api/v1/identity/users/person"+endpoint.path, "{}"); w.Code != 403 {
			t.Fatalf("%s status=%d", endpoint.path, w.Code)
		}
	}
}

func TestVerificationEmailUsesRealmDeliveryForEligibleAccount(t *testing.T) {
	sends := 0
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/admin/realms/test/users/person":
			_, _ = w.Write([]byte(`{"id":"person","username":"person","enabled":true,"email":"person@example.test"}`))
		case "/admin/realms/test/users/verified":
			_, _ = w.Write([]byte(`{"id":"verified","username":"verified","enabled":true,"email":"verified@example.test","emailVerified":true}`))
		case "/admin/realms/test/clients":
			_, _ = w.Write([]byte(`[{"id":"realm-management-id"}]`))
		case "/admin/realms/test/users/person/role-mappings/clients/realm-management-id/composite",
			"/admin/realms/test/users/verified/role-mappings/clients/realm-management-id/composite":
			_, _ = w.Write([]byte(`[]`))
		case "/admin/realms/test/users/person/send-verify-email":
			if r.Method != "PUT" || r.URL.RawQuery != "" {
				t.Error("unexpected upstream verification request")
			}
			sends++
			w.WriteHeader(204)
		default:
			t.Error("unexpected verification request", r.URL.Path)
			w.WriteHeader(500)
		}
	})
	for _, tc := range []struct {
		configured bool
		user       string
		want       string
	}{
		{false, "person", "identity_email_delivery_disabled"},
		{true, "verified", "identity_email_verification_unavailable"},
		{true, "person", ""},
	} {
		err := client.VerificationEmail(context.Background(), Realm{EmailDeliveryConfigured: tc.configured}, tc.user)
		if err == nil && tc.want != "" || err != nil && err.Error() != tc.want {
			t.Fatalf("%s: unexpected verification result %v", tc.user, err)
		}
	}
	if sends != 1 {
		t.Fatalf("sent %d verification requests", sends)
	}
}

func TestDirectoryFilterAndRegisteredApplicationPagination(t *testing.T) {
	client := fixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/admin/realms/test":
			_, _ = w.Write([]byte(`{"id":"realm-id"}`))
		case "/admin/realms/test/roles/app-access-mito":
			_, _ = w.Write([]byte(`{"id":"role-id","name":"app-access-mito"}`))
		case "/admin/realms/test/roles/app-access-mito/users", "/admin/realms/test/users":
			query := r.URL.Query()
			if query.Get("first") != "50" || query.Get("max") != "51" || (strings.HasSuffix(r.URL.Path, "/test/users") && (query.Get("search") != "example" || query.Get("enabled") != "true" || query.Get("emailVerified") != "false")) {
				t.Error("unexpected directory filters")
			}
			_, _ = w.Write([]byte(`[{"id":"owner","username":"owner","requiredActions":["UPDATE_PASSWORD"]}]`))
		default:
			t.Error("unexpected directory request", r.URL.Path)
			w.WriteHeader(500)
		}
	})
	r := router(client, 7)
	for _, path := range []string{"/users?first=50&search=example&enabled=true&emailVerified=false", "/applications/mito/users?first=50"} {
		w := perform(r, "GET", "/api/v1/identity"+path, "")
		if w.Code != 200 || !strings.Contains(w.Body.String(), `"requiredActions":["UPDATE_PASSWORD"]`) {
			t.Fatal(w.Body.String())
		}
	}
	if w := perform(r, "GET", "/api/v1/identity/applications/unknown/users", ""); w.Code != 403 {
		t.Fatal("unregistered application was queried")
	}
	if w := perform(r, "GET", "/api/v1/identity/users?enabled=all", ""); w.Code != 400 {
		t.Fatal("invalid status was accepted")
	}
}

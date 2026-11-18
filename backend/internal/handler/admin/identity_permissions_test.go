package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/identityadmin"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type identityPermissionAdmin struct {
	service.AdminService
	user    *service.User
	updated *service.UpdateUserInput
}

func (s *identityPermissionAdmin) GetUser(context.Context, int64) (*service.User, error) {
	return s.user, nil
}
func (s *identityPermissionAdmin) GetAllGroupsIncludingInactive(context.Context) ([]service.Group, error) {
	return []service.Group{{ID: 3, Name: "billing", Status: "active"}}, nil
}
func (s *identityPermissionAdmin) ListUserGroups(context.Context) ([]service.UserGroup, error) {
	return []service.UserGroup{{ID: 2, Name: "business", Status: "active"}}, nil
}
func (s *identityPermissionAdmin) GetUserGroup(context.Context, int64) (*service.UserGroup, error) {
	return &service.UserGroup{ID: 2, Status: "active"}, nil
}
func (s *identityPermissionAdmin) GetGroup(context.Context, int64) (*service.Group, error) {
	return &service.Group{ID: 3, Status: "active"}, nil
}
func (s *identityPermissionAdmin) UpdateUser(_ context.Context, _ int64, in *service.UpdateUserInput) (*service.User, error) {
	s.updated = in
	return s.user, nil
}

func permissionRouter(t *testing.T, s *identityPermissionAdmin, protected bool, roles ...string) *gin.Engine {
	t.Helper()
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/realms/test/protocol/openid-connect/token":
			_, _ = w.Write([]byte(`{"access_token":"test","expires_in":300}`))
		case "/admin/realms/test":
			_, _ = w.Write([]byte(`{"id":"realm-id"}`))
		case "/admin/realms/test/users/person":
			_, _ = w.Write([]byte(`{"id":"person","enabled":true}`))
		case "/admin/realms/test/clients":
			_, _ = w.Write([]byte(`[{"id":"realm-admin"}]`))
		default:
			_, _ = w.Write([]byte(`[]`))
		}
	}))
	t.Cleanup(srv.Close)
	ca := filepath.Join(t.TempDir(), "ca.pem")
	require.NoError(t, os.WriteFile(ca, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: srv.Certificate().Raw}), 0600))
	u, err := url.Parse(srv.URL)
	require.NoError(t, err)
	subjects := []string{}
	if protected {
		subjects = []string{"person"}
	}
	directory, err := identityadmin.NewClient(identityadmin.Config{Origin: srv.URL, RealmName: "test", RealmID: "realm-id", CAFile: ca, ConnectAddress: u.Host, AllowedUserIDs: []int64{7}, ProtectedSubjects: subjects})
	require.NoError(t, err)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(string(middleware.ContextKeyUser), middleware.AuthSubject{UserID: 7})
		role := service.RoleAdmin
		if len(roles) > 0 {
			role = roles[0]
		}
		c.Set(string(middleware.ContextKeyUserRole), role)
		c.Next()
	})
	h := &UserHandler{adminService: s}
	group := r.Group("/identity")
	h.RegisterIdentityPermissions(group, group, directory, srv.URL+"/realms/test", func(context.Context, string) (*service.User, error) { return s.user, nil })
	return r
}

func permissionRequest(r http.Handler, method string, body any) *httptest.ResponseRecorder {
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(method, "/identity/users/person/mito", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestIdentityPermissionsPersistThroughExistingAdminService(t *testing.T) {
	gid := int64(2)
	s := &identityPermissionAdmin{user: &service.User{ID: 9, Role: "user", Status: "active", UserGroupID: &gid}}
	r := permissionRouter(t, s, false)
	w := permissionRequest(r, "GET", nil)
	require.Equal(t, 200, w.Code)
	require.NotContains(t, w.Body.String(), "password")
	in := identityPermissionInput{Role: "observer", Status: "active", UserGroupID: new(int64(2)), RestrictPublicGroups: new(false), AllowedGroups: []int64{3}, ObserverGroupIDs: []int64{3}, Concurrency: new(2), RPMLimit: new(15), Revision: s.user.MitoPermissions().Revision, Reason: "Reviewed resource access"}
	w = permissionRequest(r, "PUT", in)
	require.Equal(t, 200, w.Code, w.Body.String())
	require.NotNil(t, s.updated)
	require.Equal(t, int64(7), s.updated.ActorAdminID)
	require.Equal(t, "observer", s.updated.Role)
	require.Equal(t, []int64{3}, *s.updated.AllowedGroups)
	require.Equal(t, int64(2), *s.updated.UserGroupID)
	require.Nil(t, s.updated.Balance)
	require.Empty(t, s.updated.Password)
}

func TestIdentityPermissionsBlockProtectedStaleAndInvalidWrites(t *testing.T) {
	for _, test := range []struct {
		name      string
		protected bool
		mutate    func(*identityPermissionInput, *service.User)
		want      int
	}{
		{"maintenance", true, func(*identityPermissionInput, *service.User) {}, 403},
		{"self", false, func(_ *identityPermissionInput, u *service.User) { u.ID = 7 }, 403},
		{"stale", false, func(in *identityPermissionInput, _ *service.User) {
			in.Revision = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
		}, 409},
		{"admin-disable", false, func(in *identityPermissionInput, u *service.User) {
			u.Role = "admin"
			in.Status = "disabled"
			in.Revision = u.MitoPermissions().Revision
		}, 400},
		{"invalid-scope", false, func(in *identityPermissionInput, _ *service.User) { in.ObserverGroupIDs = []int64{-1} }, 400},
		{"omitted-limit", false, func(in *identityPermissionInput, _ *service.User) { in.RPMLimit = nil }, 400},
		{"null-grants", false, func(in *identityPermissionInput, _ *service.User) { in.AllowedGroups = nil }, 400},
		{"short-reason", false, func(in *identityPermissionInput, _ *service.User) { in.Reason = "改" }, 400},
		{"reason-required", false, func(in *identityPermissionInput, _ *service.User) { in.Reason = "" }, 400},
	} {
		t.Run(test.name, func(t *testing.T) {
			s := &identityPermissionAdmin{user: &service.User{ID: 9, Role: "user", Status: "active"}}
			in := identityPermissionInput{UserGroupID: new(int64(0)), Concurrency: new(0), RPMLimit: new(0), RestrictPublicGroups: new(false), AllowedGroups: []int64{}, ObserverGroupIDs: []int64{}, Role: "user", Status: "active", Revision: s.user.MitoPermissions().Revision, Reason: "Reviewed access"}
			test.mutate(&in, s.user)
			r := permissionRouter(t, s, test.protected)
			w := permissionRequest(r, "PUT", in)
			require.Equal(t, test.want, w.Code, w.Body.String())
			require.Nil(t, s.updated)
		})
	}
}

func TestIdentityPermissionsRequireLocalAdmin(t *testing.T) {
	s := &identityPermissionAdmin{}
	for _, role := range []string{"", service.RoleUser, service.RoleObserver} {
		r := permissionRouter(t, s, false, role)
		for _, method := range []string{"GET", "PUT"} {
			w := permissionRequest(r, method, nil)
			require.Equal(t, 403, w.Code)
		}
	}
}

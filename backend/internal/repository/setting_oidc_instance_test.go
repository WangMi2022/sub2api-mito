//go:build unit

package repository

import (
	"context"
	"database/sql"
	"testing"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/Wei-Shaw/sub2api/ent"
	_ "github.com/Wei-Shaw/sub2api/ent/runtime"
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
	_ "modernc.org/sqlite"
)

func TestInstanceOIDCSettingsIsolateSharedDatabase(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })
	db.SetMaxOpenConns(1)
	_, err = db.Exec(`CREATE TABLE settings (id INTEGER PRIMARY KEY AUTOINCREMENT,
		key TEXT UNIQUE NOT NULL, value TEXT NOT NULL, updated_at datetime NOT NULL)`)
	require.NoError(t, err)
	client := ent.NewClient(ent.Driver(entsql.OpenDB(dialect.SQLite, db)))
	shared := NewSettingRepository(client)
	ctx := context.Background()
	baseline := map[string]string{
		service.SettingKeyOIDCConnectEnabled:         "false",
		service.SettingKeyOIDCConnectClientSecret:    "shared-secret",
		service.SettingKeyOIDCConnectUsePKCE:         "false",
		service.SettingKeyOIDCConnectValidateIDToken: "false",
		"oidc_connect_future_setting":                "shared-only",
		"site_name":                                  "Before",
	}
	require.NoError(t, shared.SetMultiple(ctx, baseline))
	cfg := &config.Config{OIDC: config.OIDCConnectConfig{
		SettingsSource: "instance", Enabled: true, ProviderName: "Local Keycloak",
		ClientID: "mito", ClientSecret: "instance-secret", IssuerURL: "https://id.example/realms/dev",
		AuthorizeURL: "https://id.example/auth", TokenURL: "https://id.example/token",
		JWKSURL: "https://id.example/certs", Scopes: "openid profile",
		RedirectURL:         "https://mito.example/api/v1/auth/oauth/oidc/callback",
		FrontendRedirectURL: "/auth/oidc/callback", TokenAuthMethod: "client_secret_basic",
		UsePKCE: true, ValidateIDToken: true, AllowedSigningAlgs: "RS256", ClockSkewSeconds: 60,
	}}
	local := ProvideSettingRepository(client, cfg)
	value, err := local.GetValue(ctx, service.SettingKeyOIDCConnectEnabled)
	require.NoError(t, err)
	require.Equal(t, "true", value)
	_, err = local.Get(ctx, "oidc_connect_future_setting")
	require.ErrorIs(t, err, service.ErrSettingNotFound)
	values, err := local.GetMultiple(ctx, []string{service.SettingKeyOIDCConnectClientSecret, "site_name", "oidc_connect_future_setting"})
	require.NoError(t, err)
	require.Equal(t, map[string]string{service.SettingKeyOIDCConnectClientSecret: "instance-secret", "site_name": "Before"}, values)
	all, err := local.GetAll(ctx)
	require.NoError(t, err)
	require.Equal(t, "true", all[service.SettingKeyOIDCConnectUsePKCE])
	require.NotContains(t, all, "oidc_connect_future_setting")
	svc := service.NewSettingService(local, cfg)
	public, err := svc.GetPublicSettings(ctx)
	require.NoError(t, err)
	require.True(t, public.OIDCOAuthEnabled)
	require.Equal(t, "Local Keycloak", public.OIDCOAuthProviderName)
	resolved, err := svc.GetOIDCConnectOAuthConfig(ctx)
	require.NoError(t, err)
	require.True(t, resolved.UsePKCE)
	require.True(t, resolved.ValidateIDToken)
	require.Equal(t, cfg.OIDC.RedirectURL, resolved.RedirectURL)
	require.Equal(t, cfg.OIDC.ClientSecret, resolved.ClientSecret)

	// Saving unrelated settings, startup defaults, single-key writes and deletion
	// must never copy this process's secret or policy to the other instance.
	require.NoError(t, local.SetMultiple(ctx, map[string]string{
		service.SettingKeyOIDCConnectClientSecret: "new-secret", "site_name": "After",
	}))
	require.NoError(t, local.Set(ctx, service.SettingKeyOIDCConnectEnabled, "true"))
	require.NoError(t, local.Delete(ctx, service.SettingKeyOIDCConnectClientSecret))
	require.NoError(t, local.SetMultiple(ctx, map[string]string{service.SettingKeyOIDCConnectEnabled: "true"}))
	baseline["site_name"] = "After"
	after, err := shared.GetAll(ctx)
	require.NoError(t, err)
	require.Equal(t, baseline, after)
	defaultRepo := ProvideSettingRepository(client, &config.Config{})
	defaultSvc := service.NewSettingService(defaultRepo, &config.Config{})
	otherPublic, err := defaultSvc.GetPublicSettings(ctx)
	require.NoError(t, err)
	require.False(t, otherPublic.OIDCOAuthEnabled)

	// An explicitly disabled instance cannot inherit enabled shared policy.
	require.NoError(t, shared.Set(ctx, service.SettingKeyOIDCConnectEnabled, "true"))
	cfg.OIDC.Enabled = false
	disabled := service.NewSettingService(ProvideSettingRepository(client, cfg), cfg)
	_, err = disabled.GetOIDCConnectOAuthConfig(ctx)
	require.Error(t, err)
	disabledPublic, err := disabled.GetPublicSettings(ctx)
	require.NoError(t, err)
	require.False(t, disabledPublic.OIDCOAuthEnabled)
}

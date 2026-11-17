package repository

import (
	"strconv"

	"github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

// ProvideSettingRepository keeps all OIDC readers on the same instance policy,
// including public login, account binding and admin settings. Other settings and
// the repository's optional transactional interfaces retain their original path.
func ProvideSettingRepository(client *ent.Client, cfg *config.Config) service.SettingRepository {
	r := &settingRepository{client: client}
	if cfg == nil || cfg.OIDC.SettingsSource != "instance" {
		return r
	}
	c := cfg.OIDC
	r.instanceOIDC = map[string]string{
		service.SettingKeyOIDCConnectEnabled:              strconv.FormatBool(c.Enabled),
		service.SettingKeyOIDCConnectRegistrationEnabled:  strconv.FormatBool(c.RegistrationEnabled),
		service.SettingKeyOIDCConnectProviderName:         c.ProviderName,
		service.SettingKeyOIDCConnectClientID:             c.ClientID,
		service.SettingKeyOIDCConnectClientSecret:         c.ClientSecret,
		service.SettingKeyOIDCConnectIssuerURL:            c.IssuerURL,
		service.SettingKeyOIDCConnectDiscoveryURL:         c.DiscoveryURL,
		service.SettingKeyOIDCConnectAuthorizeURL:         c.AuthorizeURL,
		service.SettingKeyOIDCConnectTokenURL:             c.TokenURL,
		service.SettingKeyOIDCConnectUserInfoURL:          c.UserInfoURL,
		service.SettingKeyOIDCConnectJWKSURL:              c.JWKSURL,
		service.SettingKeyOIDCConnectScopes:               c.Scopes,
		service.SettingKeyOIDCConnectRedirectURL:          c.RedirectURL,
		service.SettingKeyOIDCConnectFrontendRedirectURL:  c.FrontendRedirectURL,
		service.SettingKeyOIDCConnectTokenAuthMethod:      c.TokenAuthMethod,
		service.SettingKeyOIDCConnectUsePKCE:              strconv.FormatBool(c.UsePKCE),
		service.SettingKeyOIDCConnectValidateIDToken:      strconv.FormatBool(c.ValidateIDToken),
		service.SettingKeyOIDCConnectAllowedSigningAlgs:   c.AllowedSigningAlgs,
		service.SettingKeyOIDCConnectClockSkewSeconds:     strconv.Itoa(c.ClockSkewSeconds),
		service.SettingKeyOIDCConnectRequireEmailVerified: strconv.FormatBool(c.RequireEmailVerified),
		service.SettingKeyOIDCConnectUserInfoEmailPath:    c.UserInfoEmailPath,
		service.SettingKeyOIDCConnectUserInfoIDPath:       c.UserInfoIDPath,
		service.SettingKeyOIDCConnectUserInfoUsernamePath: c.UserInfoUsernamePath,
	}
	return r
}

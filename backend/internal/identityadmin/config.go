// Package identityadmin provides a deliberately small identity management API.
// Keycloak credentials and representations never cross the browser boundary.
package identityadmin

import (
	"encoding/json"
	"errors"
	"net"
	"net/url"
	"os"
	"strings"
)

// Config is instance-local; it must never be stored in shared site settings.
// RealmName comes from the existing, rename-aware OIDC configuration. RealmID
// pins the identity domain across renames and rejects same-name replacements.
type Config struct {
	RealmID           string        `json:"realm_id"`
	ClientID          string        `json:"client_id"`
	ClientSecret      string        `json:"client_secret"`
	ConnectAddress    string        `json:"connect_address"`
	CAFile            string        `json:"ca_file"`
	AllowedUserIDs    []int64       `json:"allowed_user_ids"`
	ProtectedSubjects []string      `json:"protected_subjects"`
	Applications      []Application `json:"applications"`
	Origin            string        `json:"-"`
	RealmName         string        `json:"-"`
}

// Application is an explicitly enrolled SSO application, never an arbitrary
// browser-supplied client. Its access role is enforced by its authentication flow.
type Application struct {
	ClientID   string `json:"clientId"`
	Name       string `json:"name"`
	AccessRole string `json:"accessRole"`
}

func LoadConfig(path, issuer string) (Config, error) {
	var cfg Config
	info, err := os.Lstat(path)
	if err != nil || !info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0 {
		return cfg, errors.New("identity administration configuration must be a private regular file")
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return cfg, errors.New("identity administration configuration unavailable")
	}
	if json.Unmarshal(raw, &cfg) != nil {
		return cfg, errors.New("invalid identity administration configuration")
	}
	u, err := url.Parse(issuer)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return cfg, errors.New("identity administration requires a trusted HTTPS issuer")
	}
	name := strings.TrimPrefix(u.Path, "/realms/")
	if !strings.HasPrefix(u.Path, "/realms/") || name == "master" || name == "" || strings.ContainsAny(name, "/\\%?#") {
		return cfg, errors.New("identity administration requires a business realm")
	}
	cfg.Origin, cfg.RealmName = "https://"+u.Host, name
	if cfg.RealmID == "" || cfg.ClientID == "" || cfg.ClientSecret == "" || len(cfg.AllowedUserIDs) == 0 || len(cfg.ProtectedSubjects) == 0 {
		return cfg, errors.New("identity administration enrollment is incomplete")
	}
	if _, _, err := net.SplitHostPort(cfg.ConnectAddress); err != nil {
		return cfg, errors.New("invalid private identity connection address")
	}
	for _, id := range cfg.AllowedUserIDs {
		if id <= 0 {
			return cfg, errors.New("invalid identity administrator ID")
		}
	}
	for _, app := range cfg.Applications {
		if app.ClientID == "" || app.Name == "" || !strings.HasPrefix(app.AccessRole, "app-access-") {
			return cfg, errors.New("invalid identity application enrollment")
		}
	}
	return cfg, nil
}

func (cfg Config) Allows(id int64) bool {
	for _, allowed := range cfg.AllowedUserIDs {
		if allowed == id && id > 0 {
			return true
		}
	}
	return false
}

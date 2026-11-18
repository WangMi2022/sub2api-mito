package identityadmin

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"
)

// Error carries a safe, stable code. Upstream bodies may contain credentials or
// implementation details, so neither HTTP responses nor transport errors escape.
type Error struct {
	Code   string
	Status int
}

func (e *Error) Error() string              { return e.Code }
func failure(code string, status int) error { return &Error{Code: code, Status: status} }

type Client struct {
	cfg     Config
	http    *http.Client
	mu      sync.Mutex
	token   string
	expires time.Time
}

func NewClient(cfg Config) (*Client, error) {
	pool, err := x509.SystemCertPool()
	if err != nil {
		pool = x509.NewCertPool()
	}
	pem, err := os.ReadFile(cfg.CAFile)
	if err != nil || !pool.AppendCertsFromPEM(pem) {
		return nil, errors.New("identity administration CA unavailable")
	}
	u, _ := url.Parse(cfg.Origin)
	dialer := &net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS12, RootCAs: pool, ServerName: u.Hostname()},
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return dialer.DialContext(ctx, "tcp", cfg.ConnectAddress)
		},
		MaxIdleConns: 8, MaxIdleConnsPerHost: 8, IdleConnTimeout: 30 * time.Second,
	}
	return &Client{cfg: cfg, http: &http.Client{Transport: transport, Timeout: 15 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}, nil
}

func (c *Client) accessToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" && time.Now().Before(c.expires) {
		return c.token, nil
	}
	form := url.Values{"grant_type": {"client_credentials"}, "client_id": {c.cfg.ClientID}, "client_secret": {c.cfg.ClientSecret}}
	req, err := http.NewRequestWithContext(ctx, "POST", c.cfg.Origin+"/realms/"+url.PathEscape(c.cfg.RealmName)+"/protocol/openid-connect/token", bytes.NewBufferString(form.Encode()))
	if err != nil {
		return "", failure("identity_unavailable", 503)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.http.Do(req)
	if err != nil {
		return "", failure("identity_unavailable", 503)
	}
	defer resp.Body.Close()
	var token struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if resp.StatusCode != 200 || json.NewDecoder(io.LimitReader(resp.Body, 65536)).Decode(&token) != nil || token.AccessToken == "" || token.ExpiresIn <= 0 {
		return "", failure("identity_credentials_rejected", 503)
	}
	c.token = token.AccessToken
	c.expires = time.Now().Add(time.Duration(token.ExpiresIn-30) * time.Second)
	return c.token, nil
}

func (c *Client) request(ctx context.Context, method, suffix string, body, out any) error {
	token, err := c.accessToken(ctx)
	if err != nil {
		return err
	}
	var raw []byte
	if body != nil {
		raw, err = json.Marshal(body)
		if err != nil {
			return failure("invalid_request", 400)
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, c.cfg.Origin+"/admin/realms/"+url.PathEscape(c.cfg.RealmName)+suffix, bytes.NewReader(raw))
	if err != nil {
		return failure("invalid_request", 400)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return failure("identity_unavailable", 503)
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case 401:
		c.mu.Lock()
		c.token = ""
		c.mu.Unlock()
		return failure("identity_credentials_rejected", 503)
	case 403:
		return failure("identity_operation_forbidden", 403)
	case 404:
		return failure("identity_not_found", 404)
	case 409:
		return failure("identity_conflict", 409)
	case 400:
		return failure("identity_validation_failed", 400)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return failure("identity_unavailable", 503)
	}
	if out != nil && resp.StatusCode != 204 {
		if json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(out) != nil {
			return failure("identity_invalid_response", 502)
		}
	}
	return nil
}

type Realm struct {
	ID                      string `json:"id"`
	Name                    string `json:"realm"`
	DisplayName             string `json:"displayName"`
	UsernameEditable        bool   `json:"usernameEditable"`
	EmailAsUsername         bool   `json:"emailAsUsername"`
	EmailDeliveryConfigured bool   `json:"emailDeliveryConfigured"`
	LoginProtectionEnabled  bool   `json:"loginProtectionEnabled"`
}

func (c *Client) Realm(ctx context.Context) (Realm, error) {
	var upstream struct {
		ID                          string `json:"id"`
		Name                        string `json:"realm"`
		DisplayName                 string `json:"displayName"`
		EditUsernameAllowed         bool   `json:"editUsernameAllowed"`
		RegistrationEmailAsUsername bool   `json:"registrationEmailAsUsername"`
		BruteForceProtected         bool   `json:"bruteForceProtected"`
		SMTPServer                  struct {
			Host string `json:"host"`
		} `json:"smtpServer"`
	}
	if err := c.request(ctx, "GET", "", nil, &upstream); err != nil {
		return Realm{}, err
	}
	if upstream.ID != c.cfg.RealmID {
		return Realm{}, failure("identity_realm_changed", 503)
	}
	return Realm{
		ID: upstream.ID, Name: upstream.Name, DisplayName: upstream.DisplayName,
		UsernameEditable:        upstream.EditUsernameAllowed && !upstream.RegistrationEmailAsUsername,
		EmailAsUsername:         upstream.RegistrationEmailAsUsername,
		EmailDeliveryConfigured: upstream.SMTPServer.Host != "",
		LoginProtectionEnabled:  upstream.BruteForceProtected,
	}, nil
}

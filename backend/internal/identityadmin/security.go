package identityadmin

import (
	"context"
	"slices"
)

type LoginFailures struct {
	Locked      bool  `json:"disabled"`
	Failures    int   `json:"numFailures"`
	LastFailure int64 `json:"lastFailure"`
}

type UserSecurity struct {
	CredentialTypes []string       `json:"credentialTypes"`
	Providers       []string       `json:"providers"`
	LoginFailures   *LoginFailures `json:"loginFailures"`
}

func (c *Client) Security(ctx context.Context, realm Realm, id string) (UserSecurity, error) {
	out := UserSecurity{CredentialTypes: []string{}, Providers: []string{}}
	user, err := c.user(ctx, id)
	if err != nil {
		return out, err
	}
	if user.ServiceAccountClientID != "" {
		return out, failure("identity_protected_account", 403)
	}

	var credentials []struct {
		Type string `json:"type"`
	}
	if err := c.request(ctx, "GET", "/users/"+id+"/credentials", nil, &credentials); err != nil {
		return out, err
	}
	for _, credential := range credentials {
		if credential.Type != "" && !slices.Contains(out.CredentialTypes, credential.Type) {
			out.CredentialTypes = append(out.CredentialTypes, credential.Type)
		}
	}
	slices.Sort(out.CredentialTypes)

	var providers []struct {
		Alias string `json:"identityProvider"`
	}
	if err := c.request(ctx, "GET", "/users/"+id+"/federated-identity", nil, &providers); err != nil {
		return out, err
	}
	for _, provider := range providers {
		if provider.Alias != "" {
			out.Providers = append(out.Providers, provider.Alias)
		}
	}
	slices.Sort(out.Providers)

	if realm.LoginProtectionEnabled {
		out.LoginFailures = &LoginFailures{}
		if err := c.request(ctx, "GET", loginFailuresPath(id), nil, out.LoginFailures); err != nil {
			return out, err
		}
	}
	return out, nil
}

func loginFailuresPath(id string) string {
	return "/attack-detection/brute-force/users/" + id
}

func (c *Client) ClearLoginFailures(ctx context.Context, realm Realm, id string) error {
	if !realm.LoginProtectionEnabled {
		return failure("identity_login_protection_disabled", 409)
	}
	if _, err := c.mutableUser(ctx, id); err != nil {
		return err
	}
	return c.request(ctx, "DELETE", loginFailuresPath(id), nil, nil)
}

func (c *Client) VerificationEmail(ctx context.Context, realm Realm, id string) error {
	if !realm.EmailDeliveryConfigured {
		return failure("identity_email_delivery_disabled", 409)
	}
	user, err := c.mutableUser(ctx, id)
	if err != nil {
		return err
	}
	if !user.Enabled || user.EmailVerified || user.Email == "" {
		return failure("identity_email_verification_unavailable", 409)
	}
	return c.request(ctx, "PUT", "/users/"+id+"/send-verify-email", nil, nil)
}

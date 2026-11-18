package identityadmin

import (
	"context"
	"errors"
	"time"
)

type sessionAccess struct {
	allowed bool
	expires time.Time
}

func (c *Client) invalidateSessionAccess() {
	c.accessMu.Lock()
	defer c.accessMu.Unlock()
	c.accessEpoch++
	c.accessCache = nil
}

// CheckSessionAccess closes the gap between IdP admission and already issued
// Mito JWTs. External IdP changes are observed within ten seconds; mutations
// through this console invalidate the cache before and after the request.
// Failed transport/realm verification never falls back to a stale grant.
func (c *Client) CheckSessionAccess(ctx context.Context, subject, clientID string) error {
	if !objectID.MatchString(subject) {
		return failure("identity_application_denied", 403)
	}
	key := clientID + ":" + subject
	c.accessMu.Lock()
	cached, exists := c.accessCache[key]
	epoch := c.accessEpoch
	c.accessMu.Unlock()
	if exists && time.Now().Before(cached.expires) {
		if cached.allowed {
			return nil
		}
		return failure("identity_application_denied", 403)
	}
	if _, err := c.Realm(ctx); err != nil {
		return err
	}
	user, err := c.user(ctx, subject)
	var safe *Error
	if err != nil {
		if errors.As(err, &safe) && safe.Code == "identity_not_found" {
			return failure("identity_application_denied", 403)
		}
		return err
	}
	allowed := false
	if user.Enabled && user.ServiceAccountClientID == "" {
		access, err := c.access(ctx, subject)
		if err != nil {
			return err
		}
		for _, app := range access {
			if app.ClientID == clientID && app.Granted {
				allowed = true
			}
		}
	}
	c.accessMu.Lock()
	if c.accessEpoch == epoch {
		if c.accessCache == nil || len(c.accessCache) > 4096 {
			c.accessCache = map[string]sessionAccess{}
		}
		c.accessCache[key] = sessionAccess{allowed: allowed, expires: time.Now().Add(10 * time.Second)}
	}
	c.accessMu.Unlock()
	if !allowed {
		return failure("identity_application_denied", 403)
	}
	return nil
}

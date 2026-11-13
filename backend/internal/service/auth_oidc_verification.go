package service

import (
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

// OIDCIdentityVerification is server-side evidence from a validated ID token.
// Email verification and upstream metadata must never populate this field.
// It is carried only through private pending-session state or internal calls.
type OIDCIdentityVerification struct {
	Issuer     string
	Subject    string
	VerifiedAt time.Time
}

func (v *OIDCIdentityVerification) ValidateFor(provider, issuer, subject string, now time.Time) error {
	if v == nil {
		return nil
	}
	if provider != "oidc" || issuer == "" || subject == "" || v.Issuer != issuer || v.Subject != subject ||
		v.VerifiedAt.IsZero() || v.VerifiedAt.After(now) || now.Sub(v.VerifiedAt) > 15*time.Minute {
		return infraerrors.BadRequest("OIDC_VERIFICATION_INVALID", "oidc identity verification is invalid or expired")
	}
	return nil
}

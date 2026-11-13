package handler

import (
	"context"
	"testing"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func TestPendingOIDCVerificationCannotUseClaimsOrMismatchedEvidence(t *testing.T) {
	ctx := context.Background()
	for _, kind := range []string{"metadata_only", "issuer", "subject", "future", "expired", "malformed", "other_provider"} {
		t.Run(kind, func(t *testing.T) {
			_, client := newOAuthPendingFlowTestHandler(t, false)
			t.Cleanup(func() { _ = client.Close() })
			owner, err := client.User.Create().SetEmail(kind + "@example.com").SetPasswordHash("hash").SetStatus(service.StatusActive).Save(ctx)
			require.NoError(t, err)
			proof := map[string]any{"issuer": "https://issuer.example", "subject": "subject", "verified_at": time.Now().Add(-time.Second).UTC().Format(time.RFC3339Nano)}
			session := &dbent.PendingAuthSession{
				Intent: oauthIntentLogin, ProviderType: "oidc", ProviderKey: "https://issuer.example", ProviderSubject: "subject", TargetUserID: &owner.ID,
				UpstreamIdentityClaims: map[string]any{"issuer": "https://issuer.example", "email_verified": true, "verified_at": proof["verified_at"], oauthOIDCVerificationKey: proof},
				LocalFlowState:         map[string]any{oauthOIDCVerificationKey: proof},
			}
			switch kind {
			case "metadata_only":
				delete(session.LocalFlowState, oauthOIDCVerificationKey)
			case "issuer":
				proof["issuer"] = "https://other.example"
			case "subject":
				proof["subject"] = "other"
			case "future":
				proof["verified_at"] = time.Now().Add(time.Hour).UTC().Format(time.RFC3339Nano)
			case "expired":
				proof["verified_at"] = time.Now().Add(-time.Hour).UTC().Format(time.RFC3339Nano)
			case "malformed":
				proof["verified_at"] = true
			case "other_provider":
				session.ProviderType = "github"
			}
			err = applyPendingOAuthBinding(ctx, client, nil, nil, session, nil, &owner.ID, true, false)
			if kind == "metadata_only" {
				require.NoError(t, err)
				identity, err := client.AuthIdentity.Query().Only(ctx)
				require.NoError(t, err)
				require.Nil(t, identity.VerifiedAt)
			} else {
				require.Error(t, err)
				count, err := client.AuthIdentity.Query().Count(ctx)
				require.NoError(t, err)
				require.Zero(t, count)
			}
		})
	}
}

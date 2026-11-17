//go:build integration

package service_test

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/authidentity"
	"github.com/Wei-Shaw/sub2api/ent/redeemcode"
	_ "github.com/Wei-Shaw/sub2api/ent/runtime"
	dbuser "github.com/Wei-Shaw/sub2api/ent/user"
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/repository"
	"github.com/Wei-Shaw/sub2api/internal/service"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/require"
)

type oidcRegistrationIntegrationFixture struct {
	db            *sql.DB
	client        *dbent.Client
	auth          *service.AuthService
	users         service.UserRepository
	redeem        service.RedeemCodeRepository
	settings      service.SettingRepository
	encryptor     service.SecretEncryptor
	settingsSvc   *service.SettingService
	runtimeConfig *config.Config
}

var oidcRegistrationFixtureOnce sync.Once
var oidcRegistrationFixtureValue *oidcRegistrationIntegrationFixture
var oidcRegistrationFixtureErr error

func newOIDCRegistrationFixture(t *testing.T) *oidcRegistrationIntegrationFixture {
	t.Helper()
	oidcRegistrationFixtureOnce.Do(func() {
		dsn := strings.TrimSpace(os.Getenv("SUB2API_OIDC_TEST_DSN"))
		if dsn == "" {
			oidcRegistrationFixtureErr = errors.New("set SUB2API_OIDC_TEST_DSN to an isolated sub2api_oidc_registration_test database")
			return
		}
		if !strings.Contains(dsn, "sub2api_oidc_registration_test") {
			oidcRegistrationFixtureErr = errors.New("SUB2API_OIDC_TEST_DSN must reference the isolated sub2api_oidc_registration_test database")
			return
		}
		db, err := sql.Open("postgres", dsn)
		if err != nil {
			oidcRegistrationFixtureErr = err
			return
		}
		db.SetMaxOpenConns(20)
		ctx := context.Background()
		if err := db.PingContext(ctx); err != nil {
			_ = db.Close()
			oidcRegistrationFixtureErr = err
			return
		}
		if err := repository.ApplyMigrations(ctx, db); err != nil {
			_ = db.Close()
			oidcRegistrationFixtureErr = err
			return
		}
		client := dbent.NewClient(dbent.Driver(entsql.OpenDB(dialect.Postgres, db)))
		cfg := &config.Config{
			Default: config.DefaultConfig{UserBalance: 2.5, UserConcurrency: 3},
			Totp:    config.TotpConfig{EncryptionKey: strings.Repeat("42", 32)},
			OIDC:    config.OIDCConnectConfig{Enabled: true, RegistrationEnabled: true},
		}
		users := repository.NewUserRepository(client, db)
		redeem := repository.NewRedeemCodeRepository(client)
		settings := repository.NewSettingRepository(client)
		if err := settings.SetMultiple(ctx, map[string]string{
			service.SettingKeyRegistrationEnabled:              "true",
			service.SettingKeyOIDCConnectEnabled:               "true",
			service.SettingKeyOIDCConnectRegistrationEnabled:   "true",
			service.SettingKeyRegistrationEmailSuffixWhitelist: "[]",
			service.SettingKeyInvitationCodeEnabled:            "false",
			service.SettingKeyEmailVerifyEnabled:               "false",
		}); err != nil {
			_ = client.Close()
			_ = db.Close()
			oidcRegistrationFixtureErr = err
			return
		}
		settingsSvc := service.NewSettingService(settings, cfg)
		encryptor, err := repository.NewAESEncryptor(cfg)
		if err != nil {
			_ = client.Close()
			_ = db.Close()
			oidcRegistrationFixtureErr = err
			return
		}
		auth := service.NewAuthService(client, users, redeem, nil, cfg, settingsSvc, nil, nil, nil, nil, nil, nil, nil)
		oidcRegistrationFixtureValue = &oidcRegistrationIntegrationFixture{
			db: db, client: client, auth: auth, users: users, redeem: redeem,
			settings: settings, encryptor: encryptor, settingsSvc: settingsSvc, runtimeConfig: cfg,
		}
	})
	if oidcRegistrationFixtureErr != nil {
		if strings.Contains(oidcRegistrationFixtureErr.Error(), "set SUB2API_OIDC_TEST_DSN") {
			t.Skip(oidcRegistrationFixtureErr.Error())
		}
		require.NoError(t, oidcRegistrationFixtureErr)
	}
	return oidcRegistrationFixtureValue
}

func oidcRegistrationUnique(prefix string) string {
	return prefix + "-" + strings.ReplaceAll(time.Now().UTC().Format("20060102150405.000000000"), ".", "") + fmt.Sprintf("-%d", time.Now().UnixNano()%100000)
}

func (f *oidcRegistrationIntegrationFixture) serviceWithRedeem(redeem service.RedeemCodeRepository) *service.AuthService {
	return service.NewAuthService(f.client, f.users, redeem, nil, f.runtimeConfig, f.settingsSvc, nil, nil, nil, nil, nil, nil, nil)
}

func (f *oidcRegistrationIntegrationFixture) createIntent(
	t *testing.T,
	email, issuer, redirect string,
	codes ...string,
) (string, string, string) {
	t.Helper()
	suffix := oidcRegistrationUnique("bind")
	state := suffix + "-state"
	browser := suffix + "-browser"
	invitation, promo, affiliate := "", "", ""
	if len(codes) > 0 {
		invitation = codes[0]
	}
	if len(codes) > 1 {
		promo = codes[1]
	}
	if len(codes) > 2 {
		affiliate = codes[2]
	}
	result, err := f.auth.CreateOIDCRegistrationIntent(context.Background(), service.OIDCRegistrationIntentInput{
		Email: email, Issuer: issuer, RedirectTo: redirect,
		State: state, BrowserSessionKey: browser,
		InvitationCode: invitation, PromoCode: promo, AffiliateCode: affiliate,
		ExpiresAt: time.Now().UTC().Add(10 * time.Minute),
	}, f.encryptor)
	require.NoError(t, err)
	return result.IntentToken, state, browser
}

func (f *oidcRegistrationIntegrationFixture) consumeInput(
	intentToken, state, browser, issuer, redirect, email, subject string,
) service.ConsumeOIDCRegistrationIntentInput {
	return service.ConsumeOIDCRegistrationIntentInput{
		IntentToken: intentToken, State: state, BrowserSessionKey: browser,
		Issuer: issuer, ProviderSubject: subject, Email: email,
		Username: "oidc-" + subject, DisplayName: "OIDC User",
		RedirectTo: redirect,
		UpstreamMetadata: map[string]any{
			"email": email, "email_verified": true, "signup_via": "integration_test",
		},
	}
}

func TestOIDCRegistrationIntentConcurrencyAndVerifiedMetadata(t *testing.T) {
	f := newOIDCRegistrationFixture(t)
	email := oidcRegistrationUnique("race") + "@example.com"
	issuer := "https://issuer.example.com"
	redirect := "/dashboard"
	token, state, browser := f.createIntent(t, email, issuer, redirect)

	start := make(chan struct{})
	results := make(chan error, 2)
	for range 2 {
		go func() {
			<-start
			_, _, err := f.auth.ConsumeOIDCRegistrationIntent(context.Background(), f.consumeInput(
				token, state, browser, issuer, redirect, email, "subject-race",
			), f.encryptor)
			results <- err
		}()
	}
	close(start)
	var successes, consumed int
	for range 2 {
		err := <-results
		switch {
		case err == nil:
			successes++
		case errors.Is(err, service.ErrOIDCRegistrationIntentConsumed):
			consumed++
		default:
			require.NoError(t, err)
		}
	}
	require.Equal(t, 1, successes)
	require.Equal(t, 1, consumed)

	user, err := f.users.GetByEmail(context.Background(), email)
	require.NoError(t, err)
	require.Equal(t, 2.5, user.Balance)
	identity, err := f.client.AuthIdentity.Query().Where(
		authidentity.ProviderTypeEQ("oidc"),
		authidentity.ProviderKeyEQ(issuer),
		authidentity.ProviderSubjectEQ("subject-race"),
	).Only(context.Background())
	require.NoError(t, err)
	require.Equal(t, user.ID, identity.UserID)
	require.Equal(t, email, identity.Metadata["email"])
	require.Equal(t, true, identity.Metadata["email_verified"])
}

func TestOIDCRegistrationNeverAdoptsExistingEmailAndRejectsAliases(t *testing.T) {
	f := newOIDCRegistrationFixture(t)
	ctx := context.Background()
	email := oidcRegistrationUnique("existing") + "@example.com"
	issuer := "https://issuer.example.com"
	token, state, browser := f.createIntent(t, email, issuer, "/dashboard")
	require.NoError(t, f.users.Create(ctx, &service.User{
		Email: email, Username: "existing-owner", PasswordHash: "hash",
		Role: service.RoleUser, Status: service.StatusActive,
	}))

	_, _, err := f.auth.ConsumeOIDCRegistrationIntent(ctx, f.consumeInput(
		token, state, browser, issuer, "/dashboard", email, "subject-existing",
	), f.encryptor)
	require.ErrorIs(t, err, service.ErrOIDCRegistrationEmailExists)
	count, countErr := f.client.User.Query().Where(dbuser.EmailEQ(email)).Count(ctx)
	require.NoError(t, countErr)
	require.Equal(t, 1, count)
	identityCount, countErr := f.client.AuthIdentity.Query().Where(
		authidentity.ProviderKeyEQ(issuer), authidentity.ProviderSubjectEQ("subject-existing"),
	).Count(ctx)
	require.NoError(t, countErr)
	require.Zero(t, identityCount)

	t.Run("normalized_duplicate_email", func(t *testing.T) {
		duplicate := oidcRegistrationUnique("duplicate") + "@example.com"
		require.NoError(t, f.users.Create(ctx, &service.User{
			Email: duplicate, Username: "duplicate-owner", PasswordHash: "hash",
			Role: service.RoleUser, Status: service.StatusActive,
		}))
		_, err := f.auth.CreateOIDCRegistrationIntent(ctx, service.OIDCRegistrationIntentInput{
			Email: strings.ToUpper(duplicate), Issuer: issuer, RedirectTo: "/dashboard",
			State: oidcRegistrationUnique("state"), BrowserSessionKey: oidcRegistrationUnique("browser"),
			ExpiresAt: time.Now().UTC().Add(10 * time.Minute),
		}, f.encryptor)
		require.ErrorIs(t, err, service.ErrOIDCRegistrationEmailExists)
	})

	t.Run("email_alias", func(t *testing.T) {
		_, err := f.auth.CreateOIDCRegistrationIntent(ctx, service.OIDCRegistrationIntentInput{
			Email: oidcRegistrationUnique("alias") + "+tag@example.com", Issuer: issuer, RedirectTo: "/dashboard",
			State: oidcRegistrationUnique("state"), BrowserSessionKey: oidcRegistrationUnique("browser"),
			ExpiresAt: time.Now().UTC().Add(10 * time.Minute),
		}, f.encryptor)
		require.ErrorIs(t, err, service.ErrEmailAliasNotAllowed)
	})
}

func TestOIDCRegistrationIdentityMatchIsExactIssuerAndSubject(t *testing.T) {
	f := newOIDCRegistrationFixture(t)
	ctx := context.Background()
	issuerA := "https://issuer-a.example.com"
	issuerB := "https://issuer-b.example.com"
	subject := oidcRegistrationUnique("subject")
	ownerEmail := oidcRegistrationUnique("owner") + "@example.com"
	owner := &service.User{
		Email: ownerEmail, Username: "identity-owner", PasswordHash: "hash",
		Role: service.RoleUser, Status: service.StatusActive,
	}
	require.NoError(t, f.users.Create(ctx, owner))
	_, err := f.client.AuthIdentity.Create().
		SetUserID(owner.ID).SetProviderType("oidc").SetProviderKey(issuerA).SetProviderSubject(subject).
		SetVerifiedAt(time.Now().UTC()).SetMetadata(map[string]any{"email": ownerEmail}).Save(ctx)
	require.NoError(t, err)

	emailA := oidcRegistrationUnique("conflict") + "@example.com"
	tokenA, stateA, browserA := f.createIntent(t, emailA, issuerA, "/dashboard")
	_, _, err = f.auth.ConsumeOIDCRegistrationIntent(ctx, f.consumeInput(
		tokenA, stateA, browserA, issuerA, "/dashboard", emailA, subject,
	), f.encryptor)
	require.ErrorIs(t, err, service.ErrOIDCRegistrationIdentityConflict)
	require.False(t, f.userExists(t, emailA))

	emailB := oidcRegistrationUnique("exact") + "@example.com"
	tokenB, stateB, browserB := f.createIntent(t, emailB, issuerB, "/dashboard")
	_, _, err = f.auth.ConsumeOIDCRegistrationIntent(ctx, f.consumeInput(
		tokenB, stateB, browserB, issuerB, "/dashboard", emailB, subject,
	), f.encryptor)
	require.NoError(t, err)
	require.True(t, f.userExists(t, emailB))
	identityCount, err := f.client.AuthIdentity.Query().Where(
		authidentity.ProviderSubjectEQ(subject),
	).Count(ctx)
	require.NoError(t, err)
	require.Equal(t, 2, identityCount)
}

func (f *oidcRegistrationIntegrationFixture) userExists(t *testing.T, email string) bool {
	t.Helper()
	exists, err := f.users.ExistsByEmail(context.Background(), email)
	require.NoError(t, err)
	return exists
}

type oidcRegistrationFailUseRedeem struct{ service.RedeemCodeRepository }

func (oidcRegistrationFailUseRedeem) Use(context.Context, int64, int64) error {
	return errors.New("injected invitation claim failure")
}

func TestOIDCRegistrationInvitationFailureRollsBackEverything(t *testing.T) {
	f := newOIDCRegistrationFixture(t)
	ctx := context.Background()
	require.NoError(t, f.settings.Set(ctx, service.SettingKeyInvitationCodeEnabled, "true"))
	require.NoError(t, f.settings.Set(ctx, service.SettingKeyOIDCConnectRegistrationEnabled, "true"))
	t.Cleanup(func() { _ = f.settings.Set(context.Background(), service.SettingKeyInvitationCodeEnabled, "false") })

	invitation := &service.RedeemCode{
		Code: fmt.Sprintf("INV-%012d", time.Now().UnixNano()%1000000000000), Type: service.RedeemTypeInvitation,
		Status: service.StatusUnused,
	}
	require.NoError(t, f.redeem.Create(ctx, invitation))
	email := oidcRegistrationUnique("rollback") + "@example.com"
	token, state, browser := f.createIntent(t, email, "https://issuer.example.com", "/dashboard", invitation.Code, "PROMO", "AFFILIATE")
	failing := f.serviceWithRedeem(oidcRegistrationFailUseRedeem{RedeemCodeRepository: f.redeem})
	_, _, err := failing.ConsumeOIDCRegistrationIntent(ctx, f.consumeInput(
		token, state, browser, "https://issuer.example.com", "/dashboard", email, oidcRegistrationUnique("subject"),
	), f.encryptor)
	require.ErrorIs(t, err, service.ErrInvitationCodeInvalid)
	require.False(t, f.userExists(t, email))

	code, err := f.client.RedeemCode.Query().Where(redeemcode.IDEQ(invitation.ID)).Only(ctx)
	require.NoError(t, err)
	require.Equal(t, service.StatusUnused, code.Status)
	var consumedAt sql.NullTime
	var userID sql.NullInt64
	require.NoError(t, f.db.QueryRowContext(ctx,
		`SELECT consumed_at, user_id FROM oidc_registration_intents WHERE intent_token_hash = $1`,
		oidcRegistrationHashForTest(token),
	).Scan(&consumedAt, &userID))
	require.False(t, consumedAt.Valid)
	require.False(t, userID.Valid)
}

func oidcRegistrationHashForTest(value string) string {
	// The application stores only SHA-256 hashes. Recompute with the same input
	// normalization so this assertion also fails if a raw token is accidentally stored.
	return fmt.Sprintf("%x", sha256.Sum256([]byte(strings.TrimSpace(value))))
}

func TestOIDCRegistrationSensitiveCodesAreEncryptedAtRest(t *testing.T) {
	f := newOIDCRegistrationFixture(t)
	ctx := context.Background()
	email := oidcRegistrationUnique("encrypted") + "@example.com"
	invitation := "INVITATION-PLAINTEXT"
	promo := "PROMO-PLAINTEXT"
	affiliate := "AFFILIATE-PLAINTEXT"
	token, _, _ := f.createIntent(t, email, "https://issuer.example.com", "/dashboard", invitation, promo, affiliate)

	var invitationCipher, promoCipher, affiliateCipher sql.NullString
	require.NoError(t, f.db.QueryRowContext(ctx,
		`SELECT invitation_code_encrypted, promo_code_encrypted, affiliate_code_encrypted
		   FROM oidc_registration_intents WHERE intent_token_hash = $1`,
		oidcRegistrationHashForTest(token),
	).Scan(&invitationCipher, &promoCipher, &affiliateCipher))
	for i, item := range []struct {
		stored sql.NullString
		plain  string
	}{
		{invitationCipher, invitation},
		{promoCipher, promo},
		{affiliateCipher, affiliate},
	} {
		require.True(t, item.stored.Valid, "code %d must be stored", i)
		require.NotEqual(t, item.plain, item.stored.String)
		require.NotContains(t, item.stored.String, item.plain)
		decrypted, err := f.encryptor.Decrypt(item.stored.String)
		require.NoError(t, err)
		require.Equal(t, item.plain, decrypted)
	}
}

func TestOIDCRegistrationIntentBindingAndOneTimeUse(t *testing.T) {
	f := newOIDCRegistrationFixture(t)
	ctx := context.Background()
	issuer := "https://issuer.example.com"
	redirect := "/dashboard"

	t.Run("mismatched_binding_is_rejected", func(t *testing.T) {
		email := oidcRegistrationUnique("mismatch") + "@example.com"
		token, state, browser := f.createIntent(t, email, issuer, redirect)
		cases := []struct {
			name   string
			mutate func(*service.ConsumeOIDCRegistrationIntentInput)
		}{
			{name: "state", mutate: func(in *service.ConsumeOIDCRegistrationIntentInput) { in.State = "wrong" }},
			{name: "browser", mutate: func(in *service.ConsumeOIDCRegistrationIntentInput) { in.BrowserSessionKey = "wrong" }},
			{name: "email", mutate: func(in *service.ConsumeOIDCRegistrationIntentInput) { in.Email = "wrong@example.com" }},
			{name: "issuer", mutate: func(in *service.ConsumeOIDCRegistrationIntentInput) { in.Issuer = "https://wrong.example.com" }},
			{name: "redirect", mutate: func(in *service.ConsumeOIDCRegistrationIntentInput) { in.RedirectTo = "/settings" }},
		}
		for _, tc := range cases {
			t.Run(tc.name, func(t *testing.T) {
				in := f.consumeInput(token, state, browser, issuer, redirect, email, oidcRegistrationUnique("subject"))
				tc.mutate(&in)
				_, _, err := f.auth.ConsumeOIDCRegistrationIntent(ctx, in, f.encryptor)
				require.ErrorIs(t, err, service.ErrOIDCRegistrationIntentInvalid)
			})
		}
		_, _, err := f.auth.ConsumeOIDCRegistrationIntent(ctx, f.consumeInput(
			token, state, browser, issuer, redirect, email, oidcRegistrationUnique("subject"),
		), f.encryptor)
		require.NoError(t, err)
	})

	t.Run("expired_is_rejected", func(t *testing.T) {
		email := oidcRegistrationUnique("expired") + "@example.com"
		state := oidcRegistrationUnique("state")
		browser := oidcRegistrationUnique("browser")
		result, err := f.auth.CreateOIDCRegistrationIntent(ctx, service.OIDCRegistrationIntentInput{
			Email: email, Issuer: issuer, RedirectTo: redirect,
			State: state, BrowserSessionKey: browser,
			ExpiresAt: time.Now().UTC().Add(time.Second),
		}, f.encryptor)
		require.NoError(t, err)
		time.Sleep(1100 * time.Millisecond)
		_, _, err = f.auth.ConsumeOIDCRegistrationIntent(ctx, f.consumeInput(
			result.IntentToken, state, browser, issuer, redirect, email, oidcRegistrationUnique("subject"),
		), f.encryptor)
		require.ErrorIs(t, err, service.ErrOIDCRegistrationIntentExpired)
	})

	t.Run("second_use_is_rejected", func(t *testing.T) {
		email := oidcRegistrationUnique("consumed") + "@example.com"
		token, state, browser := f.createIntent(t, email, issuer, redirect)
		in := f.consumeInput(token, state, browser, issuer, redirect, email, oidcRegistrationUnique("subject"))
		_, _, err := f.auth.ConsumeOIDCRegistrationIntent(ctx, in, f.encryptor)
		require.NoError(t, err)
		_, _, err = f.auth.ConsumeOIDCRegistrationIntent(ctx, in, f.encryptor)
		require.ErrorIs(t, err, service.ErrOIDCRegistrationIntentConsumed)
	})
}

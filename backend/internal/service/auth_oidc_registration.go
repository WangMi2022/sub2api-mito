package service

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"entgo.io/ent/dialect"
	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/authidentity"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/logger"
)

const defaultOIDCRegistrationIntentTTL = 10 * time.Minute

var (
	ErrOIDCRegistrationDisabled = infraerrors.Forbidden(
		"OIDC_REGISTRATION_DISABLED",
		"unified identity registration is disabled",
	)
	ErrOIDCRegistrationIntentInvalid = infraerrors.BadRequest(
		"OIDC_REGISTRATION_INTENT_INVALID",
		"registration intent is invalid or does not match this browser",
	)
	ErrOIDCRegistrationIntentExpired = infraerrors.BadRequest(
		"OIDC_REGISTRATION_INTENT_EXPIRED",
		"registration intent has expired; start registration again",
	)
	ErrOIDCRegistrationIntentConsumed = infraerrors.Conflict(
		"OIDC_REGISTRATION_INTENT_CONSUMED",
		"registration intent has already been used",
	)
	ErrOIDCRegistrationEmailExists = infraerrors.Conflict(
		"OIDC_REGISTRATION_EMAIL_EXISTS",
		"an account already uses this email; sign in instead",
	)
	ErrOIDCRegistrationIdentityConflict = infraerrors.Conflict(
		"OIDC_REGISTRATION_IDENTITY_CONFLICT",
		"this unified identity is already bound to an account",
	)
	ErrOIDCRegistrationEmailMismatch = infraerrors.Conflict(
		"OIDC_REGISTRATION_EMAIL_MISMATCH",
		"the unified identity email does not match the registration request",
	)
)

type OIDCRegistrationIntentInput struct {
	Email             string
	Issuer            string
	RedirectTo        string
	State             string
	BrowserSessionKey string
	VerifyCode        string
	InvitationCode    string
	PromoCode         string
	AffiliateCode     string
	CaptchaProof      CaptchaProof
	RemoteIP          string
	ExpiresAt         time.Time
}

type OIDCRegistrationIntentResult struct {
	IntentToken string
	ExpiresAt   time.Time
}

type ConsumeOIDCRegistrationIntentInput struct {
	IntentToken       string
	State             string
	BrowserSessionKey string
	Issuer            string
	ProviderSubject   string
	Email             string
	Username          string
	DisplayName       string
	AvatarURL         string
	UpstreamMetadata  map[string]any
	RedirectTo        string
}

type oidcRegistrationIntentRow struct {
	ID                      int64
	EmailNormalized         string
	RedirectTo              string
	InvitationCodeEncrypted sql.NullString
	PromoCodeEncrypted      sql.NullString
	AffiliateCodeEncrypted  sql.NullString
	ExpiresAt               time.Time
	ConsumedAt              sql.NullTime
}

func oidcRegistrationHash(value string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(value)))
	return hex.EncodeToString(sum[:])
}

func nullableEncrypted(encryptor SecretEncryptor, value string) (any, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	if encryptor == nil {
		return nil, ErrServiceUnavailable
	}
	encrypted, err := encryptor.Encrypt(value)
	if err != nil {
		return nil, fmt.Errorf("encrypt registration intent value: %w", err)
	}
	return encrypted, nil
}

func decryptRegistrationIntentValue(encryptor SecretEncryptor, value sql.NullString) (string, error) {
	if !value.Valid || strings.TrimSpace(value.String) == "" {
		return "", nil
	}
	if encryptor == nil {
		return "", ErrServiceUnavailable
	}
	plaintext, err := encryptor.Decrypt(value.String)
	if err != nil {
		return "", fmt.Errorf("decrypt registration intent value: %w", err)
	}
	return strings.TrimSpace(plaintext), nil
}

// CreateOIDCRegistrationIntent validates the Mito-hosted registration form and
// stores a short-lived, browser-bound intent. Sensitive codes never leave the
// server in plaintext after this call.
func (s *AuthService) CreateOIDCRegistrationIntent(
	ctx context.Context,
	input OIDCRegistrationIntentInput,
	encryptor SecretEncryptor,
) (*OIDCRegistrationIntentResult, error) {
	if s == nil || s.entClient == nil || s.userRepo == nil || s.settingService == nil {
		return nil, ErrServiceUnavailable
	}
	publicSettings, err := s.settingService.GetPublicSettings(ctx)
	if err != nil {
		return nil, ErrServiceUnavailable
	}
	if !publicSettings.RegistrationEnabled || !publicSettings.OIDCOAuthEnabled || !publicSettings.OIDCRegistrationEnabled {
		return nil, ErrOIDCRegistrationDisabled
	}

	email := strings.TrimSpace(strings.ToLower(input.Email))
	if email == "" || len(email) > 255 {
		return nil, infraerrors.BadRequest("INVALID_EMAIL", "invalid email")
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return nil, infraerrors.BadRequest("INVALID_EMAIL", "invalid email")
	}
	if isReservedEmail(email) {
		return nil, ErrEmailReserved
	}
	if err := s.validateRegistrationEmailAlias(ctx, email); err != nil {
		return nil, err
	}
	if err := s.validateRegistrationEmailPolicy(ctx, email); err != nil {
		return nil, err
	}
	exists, err := s.existsByEmailOrAlias(ctx, email)
	if err != nil {
		return nil, ErrServiceUnavailable
	}
	if exists {
		return nil, ErrOIDCRegistrationEmailExists
	}
	if err := s.validateRegistrationEmailQuota(ctx, email); err != nil {
		return nil, err
	}
	if err := s.VerifyCaptcha(ctx, input.CaptchaProof, input.RemoteIP); err != nil {
		return nil, err
	}
	if s.settingService.IsEmailVerifyEnabled(ctx) {
		if strings.TrimSpace(input.VerifyCode) == "" {
			return nil, ErrEmailVerifyRequired
		}
		if s.emailService == nil {
			return nil, ErrServiceUnavailable
		}
		if err := s.emailService.VerifyCode(ctx, email, strings.TrimSpace(input.VerifyCode)); err != nil {
			return nil, fmt.Errorf("verify code: %w", err)
		}
	}
	if _, err := s.validateOAuthRegistrationInvitation(ctx, input.InvitationCode); err != nil {
		return nil, err
	}

	issuer := strings.TrimSpace(input.Issuer)
	state := strings.TrimSpace(input.State)
	browserSessionKey := strings.TrimSpace(input.BrowserSessionKey)
	if issuer == "" || state == "" || browserSessionKey == "" {
		return nil, ErrOIDCRegistrationIntentInvalid
	}
	intentToken, err := randomOpaqueToken(32)
	if err != nil {
		return nil, ErrServiceUnavailable
	}
	expiresAt := input.ExpiresAt.UTC()
	if expiresAt.IsZero() {
		expiresAt = time.Now().UTC().Add(defaultOIDCRegistrationIntentTTL)
	}
	if !expiresAt.After(time.Now().UTC()) {
		return nil, ErrOIDCRegistrationIntentExpired
	}

	invitationEncrypted, err := nullableEncrypted(encryptor, input.InvitationCode)
	if err != nil {
		return nil, err
	}
	promoEncrypted, err := nullableEncrypted(encryptor, input.PromoCode)
	if err != nil {
		return nil, err
	}
	affiliateEncrypted, err := nullableEncrypted(encryptor, input.AffiliateCode)
	if err != nil {
		return nil, err
	}

	redirectTo := strings.TrimSpace(input.RedirectTo)
	if redirectTo == "" {
		redirectTo = "/dashboard"
	}
	_, err = s.entClient.ExecContext(
		ctx,
		`INSERT INTO oidc_registration_intents
			(intent_token_hash, state_hash, browser_session_hash, email_normalized, issuer, redirect_to,
			 invitation_code_encrypted, promo_code_encrypted, affiliate_code_encrypted, expires_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		oidcRegistrationHash(intentToken),
		oidcRegistrationHash(state),
		oidcRegistrationHash(browserSessionKey),
		email,
		issuer,
		redirectTo,
		invitationEncrypted,
		promoEncrypted,
		affiliateEncrypted,
		expiresAt,
	)
	if err != nil {
		logger.LegacyPrintf("service.auth", "[Auth] Failed to create OIDC registration intent: %v", err)
		return nil, ErrServiceUnavailable
	}
	return &OIDCRegistrationIntentResult{IntentToken: intentToken, ExpiresAt: expiresAt}, nil
}

// ConsumeOIDCRegistrationIntent atomically consumes the intent and creates the
// user, exact OIDC identity, and invitation-code claim. It never adopts an
// existing account by matching email.
func (s *AuthService) ConsumeOIDCRegistrationIntent(
	ctx context.Context,
	input ConsumeOIDCRegistrationIntentInput,
	encryptor SecretEncryptor,
) (*User, string, error) {
	if s == nil || s.entClient == nil || s.userRepo == nil || s.settingService == nil {
		return nil, "", ErrServiceUnavailable
	}
	if !s.settingService.IsRegistrationEnabled(ctx) {
		return nil, "", ErrRegDisabled
	}

	email := strings.TrimSpace(strings.ToLower(input.Email))
	subject := strings.TrimSpace(input.ProviderSubject)
	issuer := strings.TrimSpace(input.Issuer)
	intentToken := strings.TrimSpace(input.IntentToken)
	state := strings.TrimSpace(input.State)
	browserSessionKey := strings.TrimSpace(input.BrowserSessionKey)
	redirectTo := strings.TrimSpace(input.RedirectTo)
	if email == "" || subject == "" || issuer == "" || intentToken == "" || state == "" || browserSessionKey == "" {
		return nil, "", ErrOIDCRegistrationIntentInvalid
	}

	tx, err := s.entClient.Tx(ctx)
	if err != nil {
		return nil, "", ErrServiceUnavailable
	}
	defer func() { _ = tx.Rollback() }()
	txCtx := dbent.NewTxContext(ctx, tx)
	txClient := tx.Client()

	if txClient.Driver().Dialect() == dialect.Postgres {
		if _, err := txClient.ExecContext(
			txCtx,
			`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
			"oidc-registration-intent:"+oidcRegistrationHash(intentToken),
		); err != nil {
			return nil, "", ErrServiceUnavailable
		}
	}

	row, err := queryOIDCRegistrationIntent(
		txCtx,
		txClient,
		oidcRegistrationHash(intentToken),
		oidcRegistrationHash(state),
		oidcRegistrationHash(browserSessionKey),
		email,
		issuer,
		redirectTo,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, "", ErrOIDCRegistrationIntentInvalid
	}
	if err != nil {
		logger.LegacyPrintf("service.auth", "[Auth] Failed to load OIDC registration intent: %v", err)
		return nil, "", ErrServiceUnavailable
	}
	now := time.Now().UTC()
	if row.ConsumedAt.Valid {
		return nil, "", ErrOIDCRegistrationIntentConsumed
	}
	if !row.ExpiresAt.After(now) {
		return nil, "", ErrOIDCRegistrationIntentExpired
	}

	identityExists, err := txClient.AuthIdentity.Query().Where(
		authidentity.ProviderTypeEQ("oidc"),
		authidentity.ProviderKeyEQ(issuer),
		authidentity.ProviderSubjectEQ(subject),
	).Exist(txCtx)
	if err != nil {
		return nil, "", ErrServiceUnavailable
	}
	if identityExists {
		return nil, "", ErrOIDCRegistrationIdentityConflict
	}
	if err := s.checkOIDCRegistrationEmailAvailability(txCtx, email); err != nil {
		if errors.Is(err, ErrOIDCRegistrationEmailExists) {
			return nil, "", err
		}
		return nil, "", ErrServiceUnavailable
	}
	if err := s.validateRegistrationEmailAlias(txCtx, email); err != nil {
		return nil, "", err
	}
	if err := s.validateRegistrationEmailPolicy(txCtx, email); err != nil {
		return nil, "", err
	}
	if err := s.validateRegistrationEmailQuota(txCtx, email); err != nil {
		return nil, "", err
	}

	invitationCode, err := decryptRegistrationIntentValue(encryptor, row.InvitationCodeEncrypted)
	if err != nil {
		return nil, "", ErrServiceUnavailable
	}
	promoCode, err := decryptRegistrationIntentValue(encryptor, row.PromoCodeEncrypted)
	if err != nil {
		return nil, "", ErrServiceUnavailable
	}
	affiliateCode, err := decryptRegistrationIntentValue(encryptor, row.AffiliateCodeEncrypted)
	if err != nil {
		return nil, "", ErrServiceUnavailable
	}
	invitation, err := s.validateOAuthRegistrationInvitation(txCtx, invitationCode)
	if err != nil {
		return nil, "", err
	}

	randomPassword, err := randomHexString(32)
	if err != nil {
		return nil, "", ErrServiceUnavailable
	}
	hashedPassword, err := s.HashPassword(randomPassword)
	if err != nil {
		return nil, "", ErrServiceUnavailable
	}
	grantPlan := s.resolveSignupGrantPlan(ctx, "oidc")
	defaultRPMLimit := s.settingService.GetDefaultUserRPMLimit(ctx)
	username := strings.TrimSpace(input.Username)
	if len([]rune(username)) > 100 {
		username = string([]rune(username)[:100])
	}
	if username == "" {
		username = oidcRegistrationFallbackUsername(subject)
	}
	user := &User{
		Email:        email,
		Username:     username,
		PasswordHash: hashedPassword,
		Role:         RoleUser,
		Balance:      grantPlan.Balance,
		Concurrency:  grantPlan.Concurrency,
		RPMLimit:     defaultRPMLimit,
		Status:       StatusActive,
		SignupSource: "oidc",
	}
	if err := s.createUserWithRegistrationEmailGuard(txCtx, user); err != nil {
		switch {
		case errors.Is(err, ErrEmailExists):
			return nil, "", ErrOIDCRegistrationEmailExists
		case errors.Is(err, ErrEmailAliasNotAllowed), errors.Is(err, ErrEmailDomainRegistrationLimit), errors.Is(err, ErrRegistrationIPLimit):
			return nil, "", err
		default:
			logger.LegacyPrintf("service.auth", "[Auth] Failed to create OIDC registration user: %v", err)
			return nil, "", ErrServiceUnavailable
		}
	}
	if invitation != nil {
		if err := s.redeemRepo.Use(txCtx, invitation.ID, user.ID); err != nil {
			return nil, "", ErrInvitationCodeInvalid
		}
	}

	metadata := map[string]any{
		"email":          email,
		"email_verified": false,
		"username":       username,
		"display_name":   strings.TrimSpace(input.DisplayName),
		"avatar_url":     strings.TrimSpace(input.AvatarURL),
		"signup_via":     "mito_oidc_registration",
	}
	for key, value := range input.UpstreamMetadata {
		metadata[key] = value
	}
	if _, err := txClient.AuthIdentity.Create().
		SetUserID(user.ID).
		SetProviderType("oidc").
		SetProviderKey(issuer).
		SetProviderSubject(subject).
		SetIssuer(issuer).
		SetVerifiedAt(now).
		SetMetadata(metadata).
		Save(txCtx); err != nil {
		return nil, "", ErrServiceUnavailable
	}
	result, err := txClient.ExecContext(
		txCtx,
		`UPDATE oidc_registration_intents SET consumed_at=$1, user_id=$2
		 WHERE id=$3 AND consumed_at IS NULL`,
		now, user.ID, row.ID,
	)
	if err != nil {
		return nil, "", ErrServiceUnavailable
	}
	affected, err := result.RowsAffected()
	if err != nil || affected != 1 {
		return nil, "", ErrOIDCRegistrationIntentConsumed
	}
	if err := tx.Commit(); err != nil {
		return nil, "", ErrServiceUnavailable
	}

	s.postAuthUserBootstrap(ctx, user, "oidc", false)
	s.assignSubscriptions(ctx, user.ID, grantPlan.Subscriptions, "auto assigned by signup defaults")
	_ = s.snapshotPlatformQuotaDefaults(ctx, user.ID, &grantPlan)
	s.bindOAuthAffiliate(ctx, user.ID, affiliateCode)
	user = s.applyOAuthSignupPromoCode(ctx, user, promoCode)
	return user, row.RedirectTo, nil
}

func queryOIDCRegistrationIntent(
	ctx context.Context,
	client *dbent.Client,
	intentHash, stateHash, browserHash, email, issuer, redirectTo string,
) (*oidcRegistrationIntentRow, error) {
	var row oidcRegistrationIntentRow
	lockClause := ""
	if client.Driver().Dialect() == dialect.Postgres {
		lockClause = " FOR UPDATE"
	}
	rows, err := client.QueryContext(
		ctx,
		`SELECT id, email_normalized, redirect_to, invitation_code_encrypted,
		        promo_code_encrypted, affiliate_code_encrypted, expires_at, consumed_at
		   FROM oidc_registration_intents
		  WHERE intent_token_hash=$1 AND state_hash=$2 AND browser_session_hash=$3
		    AND email_normalized=$4 AND issuer=$5 AND redirect_to=$6`+lockClause,
		intentHash, stateHash, browserHash, email, issuer, redirectTo,
	)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return nil, err
		}
		return nil, sql.ErrNoRows
	}
	if err := rows.Scan(
		&row.ID,
		&row.EmailNormalized,
		&row.RedirectTo,
		&row.InvitationCodeEncrypted,
		&row.PromoCodeEncrypted,
		&row.AffiliateCodeEncrypted,
		&row.ExpiresAt,
		&row.ConsumedAt,
	); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &row, nil
}

func oidcRegistrationFallbackUsername(subject string) string {
	subject = strings.TrimSpace(subject)
	if subject == "" {
		return "oidc_user"
	}
	sum := sha256.Sum256([]byte(subject))
	return "oidc_" + hex.EncodeToString(sum[:])[:12]
}

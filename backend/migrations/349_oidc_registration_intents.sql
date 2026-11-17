-- One-time browser-bound intents for Mito-hosted registration through the
-- instance OIDC provider. Codes are encrypted by the application before insert.
CREATE TABLE IF NOT EXISTS oidc_registration_intents (
    id BIGSERIAL PRIMARY KEY,
    intent_token_hash CHAR(64) NOT NULL UNIQUE,
    state_hash CHAR(64) NOT NULL UNIQUE,
    browser_session_hash CHAR(64) NOT NULL,
    email_normalized TEXT NOT NULL,
    issuer TEXT NOT NULL,
    redirect_to TEXT NOT NULL DEFAULT '/dashboard',
    invitation_code_encrypted TEXT,
    promo_code_encrypted TEXT,
    affiliate_code_encrypted TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT oidc_registration_intents_email_normalized_check
        CHECK (email_normalized = lower(btrim(email_normalized))),
    CONSTRAINT oidc_registration_intents_expiry_check
        CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_oidc_registration_intents_expires_at
    ON oidc_registration_intents (expires_at);
CREATE INDEX IF NOT EXISTS idx_oidc_registration_intents_unconsumed
    ON oidc_registration_intents (expires_at)
    WHERE consumed_at IS NULL;

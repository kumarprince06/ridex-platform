-- One-time codes, delivered by email or SMS, plus the outbox that carries them.

-- A 6-digit code is a million possibilities, so it must be attempt-capped as well as expiring.
ALTER TABLE user_tokens ADD COLUMN attempts SMALLINT NOT NULL DEFAULT 0;

-- Which channel carried it. Recorded so support can answer "where was my code sent".
ALTER TABLE user_tokens ADD COLUMN delivery_channel VARCHAR(20);

-- OTP codes are BCrypt-hashed, not SHA-256: lookup is by user and purpose, so the digest never
-- has to be deterministic, and a SHA-256 of six digits is reversed by a table of a million rows.
ALTER TABLE user_tokens DROP CONSTRAINT IF EXISTS uk_user_tokens_token_hash;

-- Finding the live code for an account is now the hot path.
CREATE INDEX idx_user_tokens_user_purpose_live ON user_tokens (user_id, purpose, consumed_at);

-- Written inside the transaction that caused it, drained by a worker afterwards. A trip that
-- completed always has its message queued, and a rolled-back one never sends.
CREATE TABLE notification_outbox (
    id              VARCHAR(26)  PRIMARY KEY,

    channel         VARCHAR(20)  NOT NULL,
    recipient       VARCHAR(255) NOT NULL,

    -- Template selector, not free text, so wording changes without a code change.
    event_type      VARCHAR(60)  NOT NULL,
    payload         TEXT         NOT NULL,

    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    attempts        SMALLINT     NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_error      VARCHAR(500),

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ
);

-- The worker's claim query: pending rows that are due, oldest first.
CREATE INDEX idx_notification_outbox_claim ON notification_outbox (status, next_attempt_at);

-- Refresh token theft detection and an auth audit trail.
--
-- Rotation replaces the secret in place, so a stolen token the thief already used simply stops
-- matching and nobody learns the account was compromised. Keeping one generation makes a replay
-- of a spent token detectable.

ALTER TABLE refresh_tokens ADD COLUMN previous_token_hash VARCHAR(255);

-- Not unique: token_hash uniqueness already prevents the same secret twice, and a second unique
-- index here would block the rotation UPDATE.
CREATE INDEX idx_refresh_tokens_previous_hash ON refresh_tokens (previous_token_hash);

-- Append-only. Answers "was this account compromised, and when", which a status column cannot.
CREATE TABLE auth_events (
    id          VARCHAR(26)  PRIMARY KEY,

    -- Nullable: a failed login against an address with no account still needs recording, and that
    -- row is what credential stuffing looks like.
    user_id     VARCHAR(26),

    event_type  VARCHAR(40)  NOT NULL,

    ip_address  VARCHAR(45),
    user_agent  VARCHAR(255),

    -- Context only. Never a password, token or hash.
    detail      VARCHAR(500),

    occurred_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- SET NULL, not CASCADE: deleting an account must not erase what happened to it.
    CONSTRAINT fk_auth_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_auth_events_user_time ON auth_events (user_id, occurred_at DESC);
CREATE INDEX idx_auth_events_type_time ON auth_events (event_type, occurred_at DESC);

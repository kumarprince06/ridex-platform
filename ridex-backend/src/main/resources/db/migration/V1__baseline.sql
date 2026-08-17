-- B2C baseline. Replaces the tenant-scoped V1..V17 chain, which was dropped wholesale when the
-- product moved off multi-tenant SaaS (see docs/20-ADRs.md, ADR-001). There is deliberately no
-- tenant_id anywhere in this schema and none should be reintroduced.
--
-- Conventions, applied from here on:
--   - ULID primary keys, VARCHAR(26)
--   - TIMESTAMPTZ for every instant, stored UTC, converted at the edge
--   - names live on profiles (V2), not on the identity row

CREATE TABLE users (
    id               VARCHAR(26)  PRIMARY KEY,

    email            VARCHAR(255) NOT NULL,
    phone            VARCHAR(30),

    password_hash    VARCHAR(255) NOT NULL,

    status           VARCHAR(50)  NOT NULL,

    email_verified_at TIMESTAMPTZ,
    last_login_at     TIMESTAMPTZ,

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uk_users_email UNIQUE (email),
    -- The ERD marks phone unique. NULLs do not collide in Postgres, so accounts that have not
    -- supplied a number yet are unaffected.
    CONSTRAINT uk_users_phone UNIQUE (phone)
);

-- One account can hold several roles: a driver who also takes rides is one person, one login.
-- Which app they signed into is a request-time concern, not stored here.
CREATE TABLE user_roles (
    user_id VARCHAR(26) NOT NULL,
    role    VARCHAR(30) NOT NULL,

    PRIMARY KEY (user_id, role),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE refresh_tokens (
    id           VARCHAR(26)  PRIMARY KEY,
    user_id      VARCHAR(26)  NOT NULL,

    token_hash   VARCHAR(255) NOT NULL,

    -- One live row per device, so this table doubles as the session list that
    -- FR-AUTH-007 needs. A separate user_sessions table would carry the same rows.
    user_agent   VARCHAR(255),
    ip_address   VARCHAR(45),
    last_used_at TIMESTAMPTZ,

    expires_at   TIMESTAMPTZ  NOT NULL,
    revoked_at   TIMESTAMPTZ,

    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uk_refresh_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id    ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- Email verification and password reset differ only in intent: both are single-use, hashed,
-- expiring, user-scoped. One table with a purpose column instead of two identical ones.
CREATE TABLE user_tokens (
    id          VARCHAR(26)  PRIMARY KEY,
    user_id     VARCHAR(26)  NOT NULL,

    purpose     VARCHAR(30)  NOT NULL,
    token_hash  VARCHAR(255) NOT NULL,

    expires_at  TIMESTAMPTZ  NOT NULL,
    -- Non-null means spent. Redemption stamps it rather than deleting the row, so a replay is
    -- distinguishable from a token that never existed.
    consumed_at TIMESTAMPTZ,

    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uk_user_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_user_tokens_user_purpose ON user_tokens (user_id, purpose);
CREATE INDEX idx_user_tokens_expires_at   ON user_tokens (expires_at);

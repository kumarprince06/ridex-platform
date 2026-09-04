-- Loyalty points and referrals.
--
-- Points are NOT money. There is no currency column here on purpose: a point is a promise the
-- platform can honour at a rate it sets, not a balance anyone can withdraw. Mixing the two in one
-- ledger is how a loyalty scheme quietly becomes an unlicensed deposit product.
--
-- Redemption is where points touch money, and that crossing happens in exactly one place: a
-- DISCOUNT line on a fare, priced by a rate the server owns.

-- Every account can refer. The code is public by design - it is meant to be shared.
ALTER TABLE users ADD COLUMN referral_code VARCHAR(12);
ALTER TABLE users ADD CONSTRAINT uk_users_referral_code UNIQUE (referral_code);

CREATE TABLE point_entries (
    id              VARCHAR(26)  PRIMARY KEY,
    user_id         VARCHAR(26)  NOT NULL,

    -- Signed: earning is positive, spending is negative. One column, so a balance is a SUM and
    -- cannot disagree with the entries that make it up.
    points          INTEGER      NOT NULL,

    reason          VARCHAR(40)  NOT NULL,

    -- What caused it: a ride, a referral, an admin adjustment.
    reference_type  VARCHAR(30),
    reference_id    VARCHAR(26),

    -- Awarding the same referral twice is the obvious abuse, so the database refuses it rather
    -- than the application remembering to check.
    idempotency_key VARCHAR(120) NOT NULL,

    note            VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uk_point_entries_idempotency UNIQUE (idempotency_key),
    CONSTRAINT fk_point_entries_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_point_entries_non_zero CHECK (points <> 0)
);

CREATE INDEX idx_point_entries_user ON point_entries (user_id, created_at DESC);

CREATE TABLE referrals (
    id                VARCHAR(26)  PRIMARY KEY,

    referrer_user_id  VARCHAR(26)  NOT NULL,
    referee_user_id   VARCHAR(26)  NOT NULL,
    code              VARCHAR(12)  NOT NULL,

    -- PENDING until the referee actually completes a ride. Awarding at signup pays for accounts,
    -- not for riders, and is farmed within a week of launch.
    status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    qualified_at      TIMESTAMPTZ,

    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- One account is referred once, ever. Without this, a person could be "referred" repeatedly
    -- by different friends.
    CONSTRAINT uk_referrals_referee UNIQUE (referee_user_id),
    CONSTRAINT fk_referrals_referrer FOREIGN KEY (referrer_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_referrals_referee FOREIGN KEY (referee_user_id) REFERENCES users (id) ON DELETE CASCADE,
    -- Referring yourself is not a referral.
    CONSTRAINT ck_referrals_not_self CHECK (referrer_user_id <> referee_user_id)
);

CREATE INDEX idx_referrals_referrer ON referrals (referrer_user_id, created_at DESC);
CREATE INDEX idx_referrals_status ON referrals (status) WHERE status = 'PENDING';

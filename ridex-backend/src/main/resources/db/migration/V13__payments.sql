-- Rider payments, and the ledger behind them.
--
-- Five separate financial domains per docs/13: rider payment, driver earnings, driver payout,
-- platform fees, refunds. None of them is a mutable balance field - every one is a sum over
-- append-only entries, because a balance you can overwrite is a balance nobody can audit.

CREATE TABLE payments (
    id                    VARCHAR(26)  PRIMARY KEY,
    trip_id               VARCHAR(26)  NOT NULL,
    rider_id              VARCHAR(26)  NOT NULL,

    method                VARCHAR(20)  NOT NULL,
    provider              VARCHAR(30)  NOT NULL,
    status                VARCHAR(30)  NOT NULL,

    currency              VARCHAR(3)   NOT NULL,
    -- What the trip cost before anything was taken off.
    gross_amount_minor    BIGINT       NOT NULL,
    -- Points redeemed, promotions. Signed positive, subtracted from gross.
    discount_amount_minor BIGINT       NOT NULL DEFAULT 0,
    -- What the rider is actually charged.
    net_amount_minor      BIGINT       NOT NULL,

    -- The provider's handle on this payment, and ours on the command that created it. Every
    -- externally initiated command carries a key, or a retry on a bad network is a second charge.
    provider_payment_id   VARCHAR(120),
    idempotency_key       VARCHAR(120) NOT NULL,

    failure_reason        VARCHAR(255),

    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    paid_at               TIMESTAMPTZ,

    version               BIGINT       NOT NULL DEFAULT 0,

    -- One payment per trip. A second one is a bug, not a business case.
    CONSTRAINT uk_payments_trip UNIQUE (trip_id),
    CONSTRAINT uk_payments_idempotency UNIQUE (idempotency_key),
    CONSTRAINT uk_payments_provider_id UNIQUE (provider_payment_id),
    CONSTRAINT fk_payments_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_rider FOREIGN KEY (rider_id) REFERENCES rider_profiles (id),
    CONSTRAINT ck_payments_amounts CHECK (
        gross_amount_minor >= 0 AND discount_amount_minor >= 0 AND net_amount_minor >= 0)
);

CREATE INDEX idx_payments_status ON payments (status, created_at);
CREATE INDEX idx_payments_rider ON payments (rider_id, created_at DESC);

-- Every message a provider ever sent us about a payment. Deduplicated by their event id, with a
-- unique constraint rather than an "if exists" check: providers deliver the same event twice by
-- design, and sometimes concurrently.
CREATE TABLE payment_events (
    id                VARCHAR(26)  PRIMARY KEY,
    payment_id        VARCHAR(26),

    provider          VARCHAR(30)  NOT NULL,
    provider_event_id VARCHAR(160) NOT NULL,
    event_type        VARCHAR(60)  NOT NULL,

    payload           TEXT,
    received_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uk_payment_events_provider_event UNIQUE (provider, provider_event_id),
    CONSTRAINT fk_payment_events_payment FOREIGN KEY (payment_id) REFERENCES payments (id)
);

CREATE INDEX idx_payment_events_payment ON payment_events (payment_id, received_at DESC);

CREATE TABLE refunds (
    id                  VARCHAR(26)  PRIMARY KEY,
    payment_id          VARCHAR(26)  NOT NULL,

    amount_minor        BIGINT       NOT NULL,
    currency            VARCHAR(3)   NOT NULL,
    reason              VARCHAR(500) NOT NULL,
    status              VARCHAR(30)  NOT NULL,

    provider_refund_id  VARCHAR(120),
    idempotency_key     VARCHAR(120) NOT NULL,

    -- Who authorised it. A refund with no name against it is the one nobody can explain later.
    issued_by_user_id   VARCHAR(26),

    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,

    CONSTRAINT uk_refunds_idempotency UNIQUE (idempotency_key),
    CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id) REFERENCES payments (id),
    CONSTRAINT fk_refunds_issuer FOREIGN KEY (issued_by_user_id) REFERENCES users (id),
    CONSTRAINT ck_refunds_amount CHECK (amount_minor > 0)
);

CREATE INDEX idx_refunds_payment ON refunds (payment_id, created_at DESC);

-- The ledger. Append-only, double-entry in spirit: every movement names an account, a direction
-- and a reference, and a balance is a SUM. Nothing here is ever updated.
CREATE TABLE ledger_entries (
    id              VARCHAR(26)  PRIMARY KEY,

    -- RIDER, DRIVER, PLATFORM. Who the money moved for.
    account_type    VARCHAR(20)  NOT NULL,
    account_id      VARCHAR(26),

    direction       VARCHAR(10)  NOT NULL,
    amount_minor    BIGINT       NOT NULL,
    currency        VARCHAR(3)   NOT NULL,

    entry_type      VARCHAR(40)  NOT NULL,
    reference_type  VARCHAR(30),
    reference_id    VARCHAR(26),

    idempotency_key VARCHAR(140) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uk_ledger_entries_idempotency UNIQUE (idempotency_key),
    CONSTRAINT ck_ledger_entries_amount CHECK (amount_minor > 0),
    CONSTRAINT ck_ledger_entries_direction CHECK (direction IN ('DEBIT', 'CREDIT'))
);

CREATE INDEX idx_ledger_entries_account ON ledger_entries (account_type, account_id, created_at DESC);
CREATE INDEX idx_ledger_entries_reference ON ledger_entries (reference_type, reference_id);

-- Driver earnings per trip: gross, what the platform took, what the driver keeps. Explicit lines
-- rather than a net figure, because a driver must be able to reconstruct their payout from trips.
CREATE TABLE driver_earnings (
    id                    VARCHAR(26)  PRIMARY KEY,
    driver_id             VARCHAR(26)  NOT NULL,
    trip_id               VARCHAR(26)  NOT NULL,

    currency              VARCHAR(3)   NOT NULL,
    gross_amount_minor    BIGINT       NOT NULL,
    -- The rate applied at the time, kept so a later change cannot rewrite an old payout.
    commission_rate       NUMERIC(5, 4) NOT NULL,
    commission_minor      BIGINT       NOT NULL,
    net_amount_minor      BIGINT       NOT NULL,

    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uk_driver_earnings_trip UNIQUE (trip_id),
    CONSTRAINT fk_driver_earnings_driver FOREIGN KEY (driver_id) REFERENCES driver_profiles (id),
    CONSTRAINT fk_driver_earnings_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
);

CREATE INDEX idx_driver_earnings_driver ON driver_earnings (driver_id, created_at DESC);

-- Points the rider chose to spend on this ride, and what they were worth. Recorded on the ride
-- rather than recomputed at payment time: the rate can change between booking and completion, and
-- the rider agreed to the number they were shown.
ALTER TABLE ride_requests ADD COLUMN redeemed_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ride_requests ADD COLUMN discount_minor BIGINT NOT NULL DEFAULT 0;

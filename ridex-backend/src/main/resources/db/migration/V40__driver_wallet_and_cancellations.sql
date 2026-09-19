-- The driver wallet and what a cancellation costs each side.
--
-- A cash ride leaves the platform's commission in the driver's pocket, so the driver ledger goes
-- negative by that much. The wallet is that same ledger balance: below the limit a driver gets no
-- offers until they top it up. Money values are whole rupees so operations edits them as written.
INSERT INTO platform_settings
    (setting_key, setting_value, label, description, value_type, min_value, max_value)
VALUES
    ('driver.wallet.min-balance', '-50', 'Driver wallet limit (Rs)',
     'Lowest wallet balance that still gets offers. Below it the driver must top up to go on duty.',
     'INTEGER', -5000, 0),
    ('driver.cancel.penalty', '20', 'Driver cancellation penalty (Rs)',
     'Taken from the driver wallet when they cancel an accepted ride after the free window.',
     'INTEGER', 0, 1000),
    ('driver.cancel.grace-seconds', '60', 'Driver free-cancel window (seconds)',
     'A driver may cancel this long after accepting without a penalty - a mistaken accept.',
     'INTEGER', 0, 600),
    ('driver.no-show.wait-seconds', '300', 'Rider no-show wait (seconds)',
     'How long a driver must wait at the pickup before a no-show cancel is free and the rider pays.',
     'INTEGER', 60, 1800),
    ('cancellation.driver-share', '0.80', 'Driver share of cancellation fees',
     'Part of a late cancellation or no-show fee that goes to the driver who drove to the pickup.',
     'DECIMAL', 0, 1)
ON CONFLICT (setting_key) DO NOTHING;

-- A driver paying off what they owe. Kept apart from payments, which are always a rider's.
CREATE TABLE driver_wallet_topups (
    id                   VARCHAR(26)  PRIMARY KEY,
    driver_id            VARCHAR(26)  NOT NULL,
    currency             VARCHAR(3)   NOT NULL,
    amount_minor         BIGINT       NOT NULL,
    provider             VARCHAR(20)  NOT NULL,
    provider_order_id    VARCHAR(100) NOT NULL,
    -- Set on capture. Unique, so one gateway payment can never be credited twice.
    provider_payment_id  VARCHAR(100),
    status               VARCHAR(20)  NOT NULL DEFAULT 'CREATED',
    failure_reason       VARCHAR(500),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    paid_at              TIMESTAMPTZ,

    CONSTRAINT fk_driver_wallet_topups_driver FOREIGN KEY (driver_id) REFERENCES driver_profiles (id),
    CONSTRAINT uk_driver_wallet_topups_payment UNIQUE (provider_payment_id),
    CONSTRAINT ck_driver_wallet_topups_amount CHECK (amount_minor > 0)
);

CREATE INDEX ix_driver_wallet_topups_driver ON driver_wallet_topups (driver_id, created_at DESC);

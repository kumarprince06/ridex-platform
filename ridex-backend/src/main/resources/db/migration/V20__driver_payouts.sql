-- Driver payouts: the settlement half of driver_earnings.
--
-- V13 records what every trip earned but nothing ever pays it out, so the driver ledger balance
-- has only ever grown. A payout is one batch of unsettled earnings, moved once.

CREATE TABLE driver_payouts (
    id              VARCHAR(26)  PRIMARY KEY,
    driver_id       VARCHAR(26)  NOT NULL,

    currency        VARCHAR(3)   NOT NULL,
    amount_minor    BIGINT       NOT NULL,

    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',

    -- The window the batch covers, so a driver can line a payout up against their own trip list.
    period_start    TIMESTAMPTZ  NOT NULL,
    period_end      TIMESTAMPTZ  NOT NULL,

    -- Bank UTR or the provider's transfer id, filled in when it actually moves.
    reference       VARCHAR(100),
    failure_reason  VARCHAR(500),

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    settled_at      TIMESTAMPTZ,

    CONSTRAINT fk_driver_payouts_driver FOREIGN KEY (driver_id) REFERENCES driver_profiles (id),
    -- A payout for nothing is a bug, not a zero-value transfer somebody meant to make.
    CONSTRAINT ck_driver_payouts_amount CHECK (amount_minor > 0)
);

CREATE INDEX idx_driver_payouts_driver ON driver_payouts (driver_id, created_at DESC);
CREATE INDEX idx_driver_payouts_status ON driver_payouts (status, created_at);

-- The line that makes double payment impossible. An earning belongs to at most one payout, and a
-- batch only ever picks up rows where this is still null - so a retry cannot pay a trip twice.
ALTER TABLE driver_earnings ADD COLUMN payout_id VARCHAR(26);

ALTER TABLE driver_earnings ADD CONSTRAINT fk_driver_earnings_payout
    FOREIGN KEY (payout_id) REFERENCES driver_payouts (id);

CREATE INDEX idx_driver_earnings_unsettled ON driver_earnings (driver_id)
    WHERE payout_id IS NULL;

-- A cancellation fee that is charged, not just recorded.
--
-- The fee was written onto the cancelled ride and nothing ever collected it: the rider was told
-- they had been charged and never was. There is no card on file to charge at that moment either,
-- so it becomes a due - carried onto the next ride the rider takes and settled with that fare.
--
-- Its own table rather than a balance on the rider: a balance you overwrite is one nobody can
-- audit, and "why was I charged 30 rupees" has to be answerable a month later.

CREATE TABLE rider_dues (
    id             VARCHAR(26)  PRIMARY KEY,
    rider_id       VARCHAR(26)  NOT NULL,

    amount_minor   BIGINT       NOT NULL,
    currency       VARCHAR(3)   NOT NULL,
    reason         VARCHAR(255) NOT NULL,

    -- What created it. A cancelled ride today; nothing says it stays the only source.
    source_type    VARCHAR(30)  NOT NULL,
    source_id      VARCHAR(26)  NOT NULL,

    status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    -- The payment that finally collected it, so the charge can be traced to a receipt.
    settled_payment_id VARCHAR(26),

    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    settled_at     TIMESTAMPTZ,

    CONSTRAINT fk_rider_dues_rider FOREIGN KEY (rider_id) REFERENCES rider_profiles (id),
    CONSTRAINT ck_rider_dues_amount CHECK (amount_minor > 0),
    -- One due per source. A retried cancellation must not charge the fee twice.
    CONSTRAINT uk_rider_dues_source UNIQUE (source_type, source_id)
);

CREATE INDEX idx_rider_dues_pending ON rider_dues (rider_id) WHERE status = 'PENDING';

-- The reason, as a code the app offered rather than free text alone. Operations cannot count
-- "driver was too far" when every rider phrases it differently; the free text stays for the ones
-- that do not fit a code.
ALTER TABLE ride_requests ADD COLUMN cancellation_reason_code VARCHAR(40);

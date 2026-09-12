-- A pass is bought, so it is a third thing a payment can be for.
--
-- Its own column rather than a generic subject_type/subject_id pair: the foreign keys are what
-- stop a payment pointing at a row that was deleted, and a generic pair cannot have them.
ALTER TABLE payments
    ADD COLUMN pass_id VARCHAR(26) REFERENCES passes (id) ON DELETE CASCADE;

ALTER TABLE payments ADD CONSTRAINT uk_payments_pass UNIQUE (pass_id);

-- Exactly one subject, now out of three.
ALTER TABLE payments DROP CONSTRAINT ck_payments_subject;
ALTER TABLE payments ADD CONSTRAINT ck_payments_subject
    CHECK (num_nonnulls(trip_id, shuttle_booking_id, pass_id) = 1);

-- Points may pay for part of a pass, the same way they pay for part of a seat.
ALTER TABLE passes
    ADD COLUMN redeemed_points INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN discount_minor  BIGINT  NOT NULL DEFAULT 0;

-- A pass is prepaid: it does nothing until the money clears, so it starts pending.
ALTER TABLE passes ALTER COLUMN status SET DEFAULT 'PENDING_PAYMENT';

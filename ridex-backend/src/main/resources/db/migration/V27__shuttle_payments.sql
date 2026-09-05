-- A shuttle seat is paid for, not invoiced afterwards.
--
-- A trip is charged when it ends, because nobody knows the fare until then. A seat is the other
-- way round: the fare is published in advance, and the seat is inventory somebody else wants. So
-- the money is taken before the seat is confirmed.
--
-- payments gains a second subject rather than a second table. One payments table is what makes
-- "what has this rider been charged" a single query, and a parallel shuttle_payments would
-- duplicate the ledger, the webhook and the refund path along with it.

ALTER TABLE payments ALTER COLUMN trip_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN shuttle_booking_id VARCHAR(26);

ALTER TABLE payments
    ADD CONSTRAINT fk_payments_shuttle_booking
        FOREIGN KEY (shuttle_booking_id) REFERENCES shuttle_bookings (id) ON DELETE CASCADE,
    ADD CONSTRAINT uk_payments_shuttle_booking UNIQUE (shuttle_booking_id),
    -- Exactly one subject. A payment for both, or for neither, is money nobody can attribute.
    ADD CONSTRAINT ck_payments_subject CHECK (num_nonnulls(trip_id, shuttle_booking_id) = 1);

-- Paid, or holding the seat until it is.
--
-- Deliberately not a booking status: the exclusion constraint and the per-rider index are scoped
-- WHERE status = 'BOOKED', so an unpaid seat parked in some other status would be sold twice over
-- while the first rider was still in checkout. The seat is held from the moment it is picked, and
-- the hold expires if the money never arrives.
ALTER TABLE shuttle_bookings
    ADD COLUMN payment_status  VARCHAR(20) NOT NULL DEFAULT 'PAID',
    ADD COLUMN hold_expires_at TIMESTAMPTZ;

CREATE INDEX idx_shuttle_bookings_hold
    ON shuttle_bookings (hold_expires_at) WHERE payment_status = 'PENDING';

-- An online trip payment opens its gateway order after the trip commits, not inside it: a
-- Razorpay blip must not undo a finished trip. The payment row is its own outbox - CREATED with a
-- next_attempt_at means "the order is not open yet", and PaymentOrderWorker retries it from here.
ALTER TABLE payments
    ADD COLUMN attempts        SMALLINT     NOT NULL DEFAULT 0,
    -- Null for every payment nobody needs to retry: shuttle seats and passes are CREATED too, but
    -- open their order inside the booking request and are never claimed by the worker.
    ADD COLUMN next_attempt_at TIMESTAMPTZ,
    -- The latest gateway error, for whoever is looking at a stuck payment. failure_reason stays
    -- the final verdict.
    ADD COLUMN last_error      VARCHAR(500);

-- The worker's claim. Partial, so polling every few seconds never reads the payment history.
CREATE INDEX idx_payments_dispatch ON payments (next_attempt_at) WHERE status = 'CREATED';

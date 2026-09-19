-- The client's Idempotency-Key for opening a top-up: a double tap or a retried request returns the
-- checkout the first one opened instead of a second gateway order.
ALTER TABLE driver_wallet_topups ADD COLUMN idempotency_key VARCHAR(100);
ALTER TABLE driver_wallet_topups
    ADD CONSTRAINT uk_driver_wallet_topups_idempotency UNIQUE (driver_id, idempotency_key);

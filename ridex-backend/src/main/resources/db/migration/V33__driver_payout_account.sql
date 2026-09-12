-- Where a driver's earnings are sent.
--
-- On the profile rather than its own table: a driver has one destination at a time, and a history
-- of old accounts is a liability nobody asked for. The number is stored as given - masking on read
-- is the app's job, and a masked number cannot be paid into.
ALTER TABLE driver_profiles
    ADD COLUMN payout_account_holder VARCHAR(120),
    ADD COLUMN payout_account_number VARCHAR(34),
    ADD COLUMN payout_ifsc           VARCHAR(15),
    ADD COLUMN payout_updated_at     TIMESTAMPTZ;

-- Either all three or none: a destination missing its routing code cannot be paid, and half a
-- destination reads on the payout screen as if there is somewhere to send the money.
ALTER TABLE driver_profiles
    ADD CONSTRAINT ck_driver_payout_complete CHECK (
        (payout_account_holder IS NULL AND payout_account_number IS NULL AND payout_ifsc IS NULL)
        OR (payout_account_holder IS NOT NULL AND payout_account_number IS NOT NULL AND payout_ifsc IS NOT NULL)
    );

-- The code the rider has to show, kept where the rider can be shown it.
--
-- It was generated when a driver was assigned, returned from the service, and dropped on the floor
-- by the caller - only the bcrypt hash survived. So no rider ever saw their own pickup code, and
-- the app shipped a hardcoded "4821" to fill the hole. Same for a shuttle seat: the boarding code
-- came back once at booking and was unrecoverable the moment that screen closed.
--
-- Stored in the clear on purpose. This is not a password: it is a one-time four-to-six digit
-- secret shared between one rider and one driver for one journey, shown in plaintext on the
-- rider's screen for the whole trip and read out loud at a car window. Hashing it protects
-- nothing while the only party who can read it is the person it belongs to, and it made the
-- feature impossible. The hash stays for the driver's side, which verifies rather than reads.

ALTER TABLE trips ADD COLUMN pickup_code VARCHAR(6);
ALTER TABLE shuttle_bookings ADD COLUMN boarding_code VARCHAR(6);

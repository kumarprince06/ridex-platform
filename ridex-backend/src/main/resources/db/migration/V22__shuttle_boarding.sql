-- Who has actually got on.
--
-- Deliberately not a status value. The partial unique indexes on shuttle_bookings are scoped
-- WHERE status = 'BOOKED', so moving a boarded seat to 'BOARDED' would drop it out of the index
-- and let the same seat be sold again while the passenger is sitting in it.

ALTER TABLE shuttle_bookings ADD COLUMN boarded_at TIMESTAMPTZ;

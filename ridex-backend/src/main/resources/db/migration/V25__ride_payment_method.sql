-- How the rider intends to pay, chosen at booking.
--
-- TripService hardcoded CASH at completion, so an online payment had no way to exist: by the time
-- the fare is known the rider is getting out of the car, and asking them then is how a driver ends
-- up arguing about money on the kerb.

ALTER TABLE ride_requests
    ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH';

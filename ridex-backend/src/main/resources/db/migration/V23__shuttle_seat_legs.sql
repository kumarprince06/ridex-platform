-- A seat is sold for a leg, not for the whole run.
--
-- uk_shuttle_bookings_seat made one live booking per seat per departure, so a seat sold from stop
-- 1 to stop 2 stayed blocked for stops 2 to 9 - the far end of a commuter route ran empty while
-- riders were told it was full. On a nine-stop route that is most of the inventory.
--
-- The interval has to be enforced in the database for the same reason the old index was: two
-- riders tapping the same seat at the same instant both pass any check the application makes.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Denormalised from route_stops so the constraint has numbers to compare. Stops are append-only
-- and never resequenced, so these cannot drift from the route they were taken off.
ALTER TABLE shuttle_bookings ADD COLUMN boarding_seq  SMALLINT;
ALTER TABLE shuttle_bookings ADD COLUMN alighting_seq SMALLINT;

UPDATE shuttle_bookings b
SET boarding_seq  = (SELECT s.sequence FROM route_stops s WHERE s.id = b.boarding_stop_id),
    alighting_seq = (SELECT s.sequence FROM route_stops s WHERE s.id = b.alighting_stop_id);

ALTER TABLE shuttle_bookings ALTER COLUMN boarding_seq  SET NOT NULL;
ALTER TABLE shuttle_bookings ALTER COLUMN alighting_seq SET NOT NULL;
ALTER TABLE shuttle_bookings ADD CONSTRAINT ck_shuttle_bookings_seq
    CHECK (boarding_seq < alighting_seq);

DROP INDEX uk_shuttle_bookings_seat;

-- Half-open on purpose: [1,2) and [2,5) do not overlap, which is exactly right - the passenger
-- getting off at stop 2 vacates the seat for the one getting on there.
ALTER TABLE shuttle_bookings ADD CONSTRAINT uk_shuttle_bookings_seat_leg
    EXCLUDE USING gist (
        shuttle_trip_id WITH =,
        seat_label WITH =,
        int4range(boarding_seq, alighting_seq) WITH &&
    ) WHERE (status = 'BOOKED');

-- The one-seat-per-rider rule goes with it. A commuter booking two legs of the same run is two
-- rows on the same departure, and blocking that was an accident of the old model.
DROP INDEX uk_shuttle_bookings_rider;

CREATE UNIQUE INDEX uk_shuttle_bookings_rider_leg
    ON shuttle_bookings (shuttle_trip_id, rider_id, boarding_seq) WHERE status = 'BOOKED';

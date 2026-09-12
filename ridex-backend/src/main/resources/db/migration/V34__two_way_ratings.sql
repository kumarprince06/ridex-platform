-- A trip is rated by both people in the car.
--
-- Same row, not a second table: one ride produces at most one rating each way, and the unique key
-- on ride_id is what keeps it that way. The existing `stars` is the rider's rating of the driver;
-- these are the driver's rating of the rider.
ALTER TABLE ride_ratings
    ADD COLUMN rider_stars    SMALLINT,
    ADD COLUMN rider_comment  VARCHAR(500),
    ADD COLUMN rider_rated_at TIMESTAMPTZ,
    ADD CONSTRAINT ck_ride_ratings_rider_stars CHECK (rider_stars IS NULL OR (rider_stars >= 1 AND rider_stars <= 5));

-- The rider's own average, kept the same way the driver's is: folded in as each rating lands,
-- rather than aggregated over a table that only grows.
ALTER TABLE rider_profiles
    ADD COLUMN rating       NUMERIC(3, 2),
    ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;

-- The driver's side of a ride, for the trips list and the ratings screen.
CREATE INDEX idx_ride_ratings_rider ON ride_ratings (rider_id, created_at DESC);

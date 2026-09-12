-- Either side may rate first.
--
-- stars was NOT NULL because only the rider could rate. Now that a driver can, the row sometimes
-- exists with only their half filled in - and a rider who never rates leaves it that way for good.
ALTER TABLE ride_ratings ALTER COLUMN stars DROP NOT NULL;

ALTER TABLE ride_ratings DROP CONSTRAINT ck_ride_ratings_stars;
ALTER TABLE ride_ratings ADD CONSTRAINT ck_ride_ratings_stars
    CHECK (stars IS NULL OR (stars >= 1 AND stars <= 5));

-- A row with neither half is a row nobody wrote.
ALTER TABLE ride_ratings ADD CONSTRAINT ck_ride_ratings_somebody_rated
    CHECK (stars IS NOT NULL OR rider_stars IS NOT NULL);

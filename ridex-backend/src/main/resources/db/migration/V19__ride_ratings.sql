-- Rider-to-driver ratings.
--
-- driver_profiles.rating and .rating_count have existed since V2 with a comment saying they are
-- "maintained when a trip is rated" - but nothing ever rated a trip, so every driver has shown a
-- null rating since the platform started. This is the missing half.

CREATE TABLE ride_ratings (
    id          VARCHAR(26)  PRIMARY KEY,

    -- One rating per ride, enforced here rather than in the service. A retry, a double tap or two
    -- devices would otherwise each move the driver's average.
    ride_id     VARCHAR(26)  NOT NULL,
    rider_id    VARCHAR(26)  NOT NULL,
    driver_id   VARCHAR(26)  NOT NULL,

    stars       SMALLINT     NOT NULL,
    comment     VARCHAR(500),

    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uk_ride_ratings_ride UNIQUE (ride_id),
    CONSTRAINT fk_ride_ratings_ride FOREIGN KEY (ride_id) REFERENCES ride_requests (id),
    CONSTRAINT fk_ride_ratings_rider FOREIGN KEY (rider_id) REFERENCES rider_profiles (id),
    CONSTRAINT fk_ride_ratings_driver FOREIGN KEY (driver_id) REFERENCES driver_profiles (id),
    CONSTRAINT ck_ride_ratings_stars CHECK (stars BETWEEN 1 AND 5)
);

CREATE INDEX idx_ride_ratings_driver ON ride_ratings (driver_id, created_at DESC);

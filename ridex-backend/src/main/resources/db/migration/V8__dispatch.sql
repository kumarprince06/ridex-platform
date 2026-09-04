-- Offers: the invitations dispatch sends drivers, and the record of who answered what.

-- Whether the driver is accepting work right now. Redis holds the live position, which changes
-- every few seconds; duty is a decision the driver made and must survive a Redis restart.
ALTER TABLE driver_profiles ADD COLUMN on_duty BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE driver_profiles ADD COLUMN duty_changed_at TIMESTAMPTZ;

CREATE INDEX idx_driver_profiles_on_duty ON driver_profiles (on_duty) WHERE on_duty;

CREATE TABLE ride_offers (
    id               VARCHAR(26)  PRIMARY KEY,
    ride_request_id  VARCHAR(26)  NOT NULL,
    driver_id        VARCHAR(26)  NOT NULL,

    status           VARCHAR(20)  NOT NULL,

    -- Which wave this went out in. Offers go to a small nearest batch first and widen, so a
    -- driver two suburbs away is not woken for a ride somebody closer will take.
    wave             SMALLINT     NOT NULL DEFAULT 1,
    distance_meters  INTEGER,

    -- Server-issued. A countdown the phone computed could be waited out by a paused app.
    offered_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ  NOT NULL,
    responded_at     TIMESTAMPTZ,

    CONSTRAINT fk_ride_offers_request FOREIGN KEY (ride_request_id)
        REFERENCES ride_requests (id) ON DELETE CASCADE,
    CONSTRAINT fk_ride_offers_driver FOREIGN KEY (driver_id)
        REFERENCES driver_profiles (id) ON DELETE CASCADE,
    -- One offer per driver per ride. Re-offering the same ride to someone who declined it is how
    -- drivers learn to ignore the app.
    CONSTRAINT uk_ride_offers_ride_driver UNIQUE (ride_request_id, driver_id),
    CONSTRAINT ck_ride_offers_window CHECK (expires_at > offered_at)
);

-- The driver app's "what is waiting for me" query, and dispatch's expiry sweep.
CREATE INDEX idx_ride_offers_driver_live ON ride_offers (driver_id, status, expires_at);
CREATE INDEX idx_ride_offers_request ON ride_offers (ride_request_id, status);

-- At most one accepted offer per ride, enforced by the database rather than by hoping.
-- This is the constraint that makes the claim safe: two drivers cannot both end up on one ride
-- even if both conditional updates somehow raced through.
CREATE UNIQUE INDEX uk_ride_offers_one_winner
    ON ride_offers (ride_request_id) WHERE status = 'ACCEPTED';

-- Which driver is on a ride. Nullable until one accepts.
ALTER TABLE ride_requests ADD COLUMN assigned_driver_id VARCHAR(26);
ALTER TABLE ride_requests ADD COLUMN assigned_at TIMESTAMPTZ;

ALTER TABLE ride_requests ADD CONSTRAINT fk_ride_requests_driver
    FOREIGN KEY (assigned_driver_id) REFERENCES driver_profiles (id);

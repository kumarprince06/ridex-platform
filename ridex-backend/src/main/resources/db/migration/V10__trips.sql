-- The trip that actually happened, as distinct from the ride that was requested.
--
-- Two records on purpose. The estimate is what the rider agreed to; the trip is what occurred.
-- Comparing them is the whole point - a receipt that can say "you were quoted 8.2 km and drove
-- 8.9 km because the driver rerouted" needs both, and one row overwritten in place has neither.

CREATE TABLE trips (
    id                    VARCHAR(26)  PRIMARY KEY,
    ride_request_id       VARCHAR(26)  NOT NULL,
    driver_id             VARCHAR(26)  NOT NULL,

    -- One server-issued secret, shown to the rider as six digits and encoded in their QR. Two
    -- credentials would be two things to expire, and a revocation that missed one.
    pickup_code_hash      VARCHAR(255) NOT NULL,
    pickup_code_attempts  SMALLINT     NOT NULL DEFAULT 0,

    -- Waiting is charged from here, never from a timestamp the driver's phone chose.
    arrived_at            TIMESTAMPTZ,
    started_at            TIMESTAMPTZ,
    completed_at          TIMESTAMPTZ,

    waiting_seconds       INTEGER      NOT NULL DEFAULT 0,
    actual_distance_meters INTEGER,
    actual_duration_seconds INTEGER,

    currency              VARCHAR(3)   NOT NULL,
    final_fare_minor      BIGINT,

    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

    version               BIGINT       NOT NULL DEFAULT 0,

    -- One trip per ride. The ride is the request; the trip is the single performance of it.
    CONSTRAINT uk_trips_ride_request UNIQUE (ride_request_id),
    CONSTRAINT fk_trips_ride_request FOREIGN KEY (ride_request_id)
        REFERENCES ride_requests (id) ON DELETE CASCADE,
    CONSTRAINT fk_trips_driver FOREIGN KEY (driver_id) REFERENCES driver_profiles (id),
    CONSTRAINT ck_trips_waiting CHECK (waiting_seconds >= 0),
    CONSTRAINT ck_trips_order CHECK (
        (started_at IS NULL OR arrived_at IS NULL OR started_at >= arrived_at)
        AND (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at))
);

CREATE INDEX idx_trips_driver ON trips (driver_id, created_at DESC);

-- Append-only. This is what answers a dispute: a status column can say where a ride is, never
-- when it got there or who moved it.
CREATE TABLE trip_status_history (
    id           VARCHAR(26)  PRIMARY KEY,
    trip_id      VARCHAR(26)  NOT NULL,

    from_status  VARCHAR(30),
    to_status    VARCHAR(30)  NOT NULL,

    -- Who caused it. "The system" is an actor too, and the one people argue about.
    actor_type   VARCHAR(20)  NOT NULL,
    actor_id     VARCHAR(26),
    reason       VARCHAR(500),

    occurred_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_trip_status_history_trip FOREIGN KEY (trip_id)
        REFERENCES trips (id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_status_history_trip ON trip_status_history (trip_id, occurred_at);

-- The final fare, as lines, exactly like the estimate. Same shape on purpose: the receipt puts
-- them side by side, and two different shapes could not be compared line for line.
CREATE TABLE trip_fare_lines (
    id           VARCHAR(26)  PRIMARY KEY,
    trip_id      VARCHAR(26)  NOT NULL,

    line_type    VARCHAR(30)  NOT NULL,
    label        VARCHAR(80)  NOT NULL,
    amount_minor BIGINT       NOT NULL,
    currency     VARCHAR(3)   NOT NULL,
    sort_order   SMALLINT     NOT NULL DEFAULT 0,

    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_trip_fare_lines_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_fare_lines_trip ON trip_fare_lines (trip_id, sort_order);

-- Trip-scoped path. Live pings stay in Redis; only the simplified path of a finished trip is kept,
-- because nobody reads four-second resolution from last March.
CREATE TABLE trip_locations (
    id          VARCHAR(26)   PRIMARY KEY,
    trip_id     VARCHAR(26)   NOT NULL,

    latitude    NUMERIC(9, 6) NOT NULL,
    longitude   NUMERIC(9, 6) NOT NULL,
    recorded_at TIMESTAMPTZ   NOT NULL,

    CONSTRAINT fk_trip_locations_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_locations_trip ON trip_locations (trip_id, recorded_at);

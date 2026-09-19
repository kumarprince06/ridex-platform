-- Live shuttle tracking: a departure now actually runs, and we record each stop it reaches.

ALTER TABLE shuttle_trips
    ADD COLUMN started_at       TIMESTAMPTZ,
    ADD COLUMN completed_at     TIMESTAMPTZ,
    -- Sequence of the last stop reached; null until the first one.
    ADD COLUMN current_stop_seq SMALLINT;

CREATE TABLE shuttle_stop_events (
    id               VARCHAR(26) PRIMARY KEY,
    shuttle_trip_id  VARCHAR(26) NOT NULL,
    stop_id          VARCHAR(26) NOT NULL,
    sequence         SMALLINT    NOT NULL,
    arrived_at       TIMESTAMPTZ NOT NULL,
    -- AUTO when the GPS got within range of the stop, DRIVER when they tapped Arrived.
    source           VARCHAR(10) NOT NULL,

    CONSTRAINT fk_shuttle_stop_events_trip FOREIGN KEY (shuttle_trip_id) REFERENCES shuttle_trips (id),
    CONSTRAINT fk_shuttle_stop_events_stop FOREIGN KEY (stop_id) REFERENCES route_stops (id),
    -- A stop is reached once per run. Also what keeps the rider alerts from going out twice.
    CONSTRAINT uk_shuttle_stop_events_stop UNIQUE (shuttle_trip_id, sequence),
    CONSTRAINT ck_shuttle_stop_events_source CHECK (source IN ('AUTO', 'DRIVER'))
);

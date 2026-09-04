-- Shuttle: fixed routes, chosen seats, and passes.
--
-- This is seat inventory on a schedule, not dispatch. There are no offers and no driver search -
-- the vehicle is already going, and the question is whether a particular seat on it is free.
--
-- Deliberately its own set of tables rather than a `type` column on trips. A flag there would put
-- a conditional in every service in the codebase, which is the decision that ruins a codebase
-- slowly enough that nobody can point at when it happened. (ADR-010.)

CREATE TABLE routes (
    id           VARCHAR(26)  PRIMARY KEY,
    code         VARCHAR(20)  NOT NULL,
    name         VARCHAR(120) NOT NULL,
    description  VARCHAR(255),
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uk_routes_code UNIQUE (code)
);

CREATE TABLE route_stops (
    id           VARCHAR(26)   PRIMARY KEY,
    route_id     VARCHAR(26)   NOT NULL,

    -- Order along the route. A rider can only travel forwards, and this is what says so.
    sequence     SMALLINT      NOT NULL,
    name         VARCHAR(120)  NOT NULL,
    latitude     NUMERIC(9, 6) NOT NULL,
    longitude    NUMERIC(9, 6) NOT NULL,

    -- Minutes after departure. The timetable is the offset, not a wall-clock time, so one row
    -- serves every departure on the route.
    offset_minutes SMALLINT    NOT NULL,

    CONSTRAINT uk_route_stops_sequence UNIQUE (route_id, sequence),
    CONSTRAINT fk_route_stops_route FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE
);

CREATE INDEX idx_route_stops_route ON route_stops (route_id, sequence);

-- Published fares between stop pairs. Fixed and knowable in advance - a commuter route people
-- take twice a day cannot surge.
CREATE TABLE route_fares (
    id             VARCHAR(26) PRIMARY KEY,
    route_id       VARCHAR(26) NOT NULL,
    from_stop_id   VARCHAR(26) NOT NULL,
    to_stop_id     VARCHAR(26) NOT NULL,

    currency       VARCHAR(3)  NOT NULL,
    fare_minor     BIGINT      NOT NULL,

    CONSTRAINT uk_route_fares_pair UNIQUE (route_id, from_stop_id, to_stop_id),
    CONSTRAINT fk_route_fares_route FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE,
    CONSTRAINT fk_route_fares_from FOREIGN KEY (from_stop_id) REFERENCES route_stops (id),
    CONSTRAINT fk_route_fares_to FOREIGN KEY (to_stop_id) REFERENCES route_stops (id),
    CONSTRAINT ck_route_fares_amount CHECK (fare_minor >= 0),
    CONSTRAINT ck_route_fares_distinct CHECK (from_stop_id <> to_stop_id)
);

CREATE TABLE shuttle_schedules (
    id             VARCHAR(26)  PRIMARY KEY,
    route_id       VARCHAR(26)  NOT NULL,

    departure_time TIME         NOT NULL,
    -- Which weekdays it runs, as ISO day numbers: '1,2,3,4,5' is Monday to Friday.
    days_of_week   VARCHAR(20)  NOT NULL DEFAULT '1,2,3,4,5',

    seat_capacity  SMALLINT     NOT NULL,
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_shuttle_schedules_route FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE,
    CONSTRAINT ck_shuttle_schedules_seats CHECK (seat_capacity BETWEEN 1 AND 60)
);

CREATE INDEX idx_shuttle_schedules_route ON shuttle_schedules (route_id, departure_time);

-- One departure on one date. Materialised when somebody first books it, so an unbooked route does
-- not fill the table with rows for every day of the year.
CREATE TABLE shuttle_trips (
    id             VARCHAR(26)  PRIMARY KEY,
    schedule_id    VARCHAR(26)  NOT NULL,

    service_date   DATE         NOT NULL,
    departs_at     TIMESTAMPTZ  NOT NULL,

    driver_id      VARCHAR(26),
    vehicle_id     VARCHAR(26),

    seat_capacity  SMALLINT     NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'SCHEDULED',

    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version        BIGINT       NOT NULL DEFAULT 0,

    CONSTRAINT uk_shuttle_trips_departure UNIQUE (schedule_id, service_date),
    CONSTRAINT fk_shuttle_trips_schedule FOREIGN KEY (schedule_id) REFERENCES shuttle_schedules (id),
    CONSTRAINT fk_shuttle_trips_driver FOREIGN KEY (driver_id) REFERENCES driver_profiles (id),
    CONSTRAINT fk_shuttle_trips_vehicle FOREIGN KEY (vehicle_id) REFERENCES driver_vehicles (id)
);

CREATE INDEX idx_shuttle_trips_date ON shuttle_trips (service_date, departs_at);

-- A booked seat.
--
-- The seat label is part of the unique key, which is what actually stops two riders being sold
-- 4A on the same departure. A counter would let it happen under load and nobody would find out
-- until two people were standing at the door.
CREATE TABLE shuttle_bookings (
    id                VARCHAR(26)  PRIMARY KEY,
    shuttle_trip_id   VARCHAR(26)  NOT NULL,
    rider_id          VARCHAR(26)  NOT NULL,

    seat_label        VARCHAR(6)   NOT NULL,

    boarding_stop_id  VARCHAR(26)  NOT NULL,
    alighting_stop_id VARCHAR(26)  NOT NULL,

    currency          VARCHAR(3)   NOT NULL,
    fare_minor        BIGINT       NOT NULL,
    -- Set when the seat was covered by a pass rather than paid for.
    pass_id           VARCHAR(26),

    status            VARCHAR(20)  NOT NULL DEFAULT 'BOOKED',
    boarding_code_hash VARCHAR(255),

    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    cancelled_at      TIMESTAMPTZ,

    CONSTRAINT fk_shuttle_bookings_trip FOREIGN KEY (shuttle_trip_id)
        REFERENCES shuttle_trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_shuttle_bookings_rider FOREIGN KEY (rider_id) REFERENCES rider_profiles (id),
    CONSTRAINT fk_shuttle_bookings_boarding FOREIGN KEY (boarding_stop_id) REFERENCES route_stops (id),
    CONSTRAINT fk_shuttle_bookings_alighting FOREIGN KEY (alighting_stop_id) REFERENCES route_stops (id),
    CONSTRAINT ck_shuttle_bookings_stops CHECK (boarding_stop_id <> alighting_stop_id)
);

-- One live booking per seat per departure. A cancelled seat is released, which is why the index
-- is partial rather than a plain unique constraint.
CREATE UNIQUE INDEX uk_shuttle_bookings_seat
    ON shuttle_bookings (shuttle_trip_id, seat_label) WHERE status = 'BOOKED';

-- And one live booking per rider per departure: nobody needs two seats on the same bus.
CREATE UNIQUE INDEX uk_shuttle_bookings_rider
    ON shuttle_bookings (shuttle_trip_id, rider_id) WHERE status = 'BOOKED';

CREATE INDEX idx_shuttle_bookings_rider ON shuttle_bookings (rider_id, created_at DESC);

-- Ride types, pricing rules, and stored fare estimates.
--
-- The central decision here: a fare is a list of lines, not a number. A single total cannot answer
-- "why did my fare change", cannot carry a discount without losing what it applied to, and cannot
-- be reconciled against the final charge. Storing lines costs a table and buys the receipt.

CREATE TABLE ride_types (
    id            VARCHAR(26)  PRIMARY KEY,

    code          VARCHAR(30)  NOT NULL,
    display_name  VARCHAR(60)  NOT NULL,
    description   VARCHAR(160),

    seat_capacity SMALLINT     NOT NULL,
    sort_order    SMALLINT     NOT NULL DEFAULT 0,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,

    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uk_ride_types_code UNIQUE (code),
    CONSTRAINT ck_ride_types_seats CHECK (seat_capacity BETWEEN 1 AND 8)
);

-- Rates as data, not code: they change with fuel, city and season, and a deploy per change means
-- the numbers go stale instead.
CREATE TABLE pricing_rules (
    id                 VARCHAR(26)  PRIMARY KEY,
    ride_type_id       VARCHAR(26)  NOT NULL,

    currency           VARCHAR(3)   NOT NULL,

    base_fare_minor    BIGINT       NOT NULL,
    per_km_minor       BIGINT       NOT NULL,
    per_minute_minor   BIGINT       NOT NULL,
    minimum_fare_minor BIGINT       NOT NULL,

    -- Waiting is charged only past a free allowance: a driver arriving early must not start a
    -- meter on a rider who is still on time.
    free_waiting_seconds     INTEGER  NOT NULL DEFAULT 300,
    per_waiting_minute_minor BIGINT   NOT NULL DEFAULT 0,

    -- Read from here, never from the request. A client-supplied multiplier is a client-supplied
    -- price.
    surge_multiplier   NUMERIC(4, 2) NOT NULL DEFAULT 1.00,

    valid_from         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    valid_to           TIMESTAMPTZ,

    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_pricing_rules_ride_type FOREIGN KEY (ride_type_id)
        REFERENCES ride_types (id) ON DELETE CASCADE,
    CONSTRAINT ck_pricing_rules_non_negative CHECK (
        base_fare_minor >= 0 AND per_km_minor >= 0
        AND per_minute_minor >= 0 AND minimum_fare_minor >= 0
        AND free_waiting_seconds >= 0 AND per_waiting_minute_minor >= 0),
    -- A multiplier below 1 is a discount and belongs in a promotion, where it is auditable.
    CONSTRAINT ck_pricing_rules_surge CHECK (surge_multiplier >= 1.00 AND surge_multiplier <= 5.00),
    CONSTRAINT ck_pricing_rules_window CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE INDEX idx_pricing_rules_lookup ON pricing_rules (ride_type_id, valid_from DESC);

-- What the rider was quoted, kept so the final charge can be explained against it rather than
-- silently replacing it.
CREATE TABLE fare_estimates (
    id                   VARCHAR(26)  PRIMARY KEY,
    rider_id             VARCHAR(26)  NOT NULL,
    ride_type_id         VARCHAR(26)  NOT NULL,

    pickup_lat           NUMERIC(9, 6) NOT NULL,
    pickup_lng           NUMERIC(9, 6) NOT NULL,
    destination_lat      NUMERIC(9, 6) NOT NULL,
    destination_lng      NUMERIC(9, 6) NOT NULL,

    distance_meters      INTEGER      NOT NULL,
    duration_seconds     INTEGER      NOT NULL,

    currency             VARCHAR(3)   NOT NULL,
    total_minor          BIGINT       NOT NULL,
    surge_multiplier     NUMERIC(4, 2) NOT NULL,

    -- A quote is only honest for as long as traffic and demand hold.
    expires_at           TIMESTAMPTZ  NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_fare_estimates_rider FOREIGN KEY (rider_id)
        REFERENCES rider_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_fare_estimates_ride_type FOREIGN KEY (ride_type_id) REFERENCES ride_types (id),
    CONSTRAINT ck_fare_estimates_distance CHECK (distance_meters >= 0 AND duration_seconds >= 0)
);

CREATE INDEX idx_fare_estimates_rider ON fare_estimates (rider_id, created_at DESC);

-- Append-only. Every component of a fare, in the order it is shown. Deliberately not a set of
-- columns on fare_estimates: a discount, a toll and a surge are lines that come and go, and a
-- column per possible line is a migration per pricing idea.
CREATE TABLE fare_estimate_lines (
    id               VARCHAR(26)  PRIMARY KEY,
    fare_estimate_id VARCHAR(26)  NOT NULL,

    line_type        VARCHAR(30)  NOT NULL,
    label            VARCHAR(80)  NOT NULL,

    -- Signed: a discount is a negative line, not a positive one the reader has to know to subtract.
    amount_minor     BIGINT       NOT NULL,
    currency         VARCHAR(3)   NOT NULL,

    sort_order       SMALLINT     NOT NULL DEFAULT 0,

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_fare_estimate_lines_estimate FOREIGN KEY (fare_estimate_id)
        REFERENCES fare_estimates (id) ON DELETE CASCADE
);

CREATE INDEX idx_fare_estimate_lines ON fare_estimate_lines (fare_estimate_id, sort_order);

-- Reference data, not fixtures: without at least one ride type and rule the estimate endpoint has
-- nothing to price and the app shows an empty list.
INSERT INTO ride_types (id, code, display_name, description, seat_capacity, sort_order) VALUES
    ('01JRIDETYPEECONOMY00000001', 'ECONOMY', 'RideX Go',      'Affordable everyday rides',  4, 1),
    ('01JRIDETYPECOMFORT00000002', 'COMFORT', 'RideX Comfort', 'Newer cars, more legroom',   4, 2),
    ('01JRIDETYPEXL000000000003',  'XL',      'RideX XL',      'Room for six',               6, 3);

INSERT INTO pricing_rules
    (id, ride_type_id, currency, base_fare_minor, per_km_minor, per_minute_minor,
     minimum_fare_minor, free_waiting_seconds, per_waiting_minute_minor)
VALUES
    ('01JPRICINGRULEECONOMY00001', '01JRIDETYPEECONOMY00000001', 'INR', 3000, 1200, 150, 5000, 300, 200),
    ('01JPRICINGRULECOMFORT00002', '01JRIDETYPECOMFORT00000002', 'INR', 5000, 1800, 200, 8000, 300, 250),
    ('01JPRICINGRULEXL0000000003', '01JRIDETYPEXL000000000003',  'INR', 7000, 2200, 250, 11000, 300, 300);

-- Commuter passes: a prepaid entitlement to a seat on a route.
--
-- This is the one product here that changes the business rather than the experience. A marketplace
-- has no switching cost; a person who has paid for next month's commute does.
--
-- A pass is an entitlement, not a wallet balance. It covers a ride or it does not, and what it
-- covers is decided by the route and the dates on it - never by a number counting down that
-- somebody could spend somewhere else.

CREATE TABLE pass_products (
    id              VARCHAR(26)  PRIMARY KEY,
    route_id        VARCHAR(26)  NOT NULL,

    name            VARCHAR(120) NOT NULL,
    description     VARCHAR(255),

    -- How long it lasts from the day it starts.
    duration_days   SMALLINT     NOT NULL,
    -- Zero means unlimited within the period. A cap is what makes a weekly commuter pass
    -- different from a season ticket somebody shares with three friends.
    ride_limit      SMALLINT     NOT NULL DEFAULT 0,

    currency        VARCHAR(3)   NOT NULL,
    price_minor     BIGINT       NOT NULL,

    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_pass_products_route FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE,
    CONSTRAINT ck_pass_products_duration CHECK (duration_days BETWEEN 1 AND 366),
    CONSTRAINT ck_pass_products_price CHECK (price_minor >= 0)
);

CREATE TABLE passes (
    id              VARCHAR(26)  PRIMARY KEY,
    product_id      VARCHAR(26)  NOT NULL,
    rider_id        VARCHAR(26)  NOT NULL,
    route_id        VARCHAR(26)  NOT NULL,

    starts_on       DATE         NOT NULL,
    ends_on         DATE         NOT NULL,

    ride_limit      SMALLINT     NOT NULL,
    -- Counted rather than decremented: a used-rides count can be reconciled against the bookings,
    -- and a remaining-rides field cannot.
    rides_used      SMALLINT     NOT NULL DEFAULT 0,

    currency        VARCHAR(3)   NOT NULL,
    price_paid_minor BIGINT      NOT NULL,

    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Bound to the account, so a pass cannot be handed round an office.
    CONSTRAINT fk_passes_product FOREIGN KEY (product_id) REFERENCES pass_products (id),
    CONSTRAINT fk_passes_rider FOREIGN KEY (rider_id) REFERENCES rider_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_passes_route FOREIGN KEY (route_id) REFERENCES routes (id),
    CONSTRAINT ck_passes_dates CHECK (ends_on >= starts_on)
);

CREATE INDEX idx_passes_rider ON passes (rider_id, ends_on DESC);
-- The lookup that runs on every shuttle booking: does this rider hold a live pass for this route?
CREATE INDEX idx_passes_active ON passes (rider_id, route_id, status, ends_on);

ALTER TABLE shuttle_bookings ADD CONSTRAINT fk_shuttle_bookings_pass
    FOREIGN KEY (pass_id) REFERENCES passes (id);

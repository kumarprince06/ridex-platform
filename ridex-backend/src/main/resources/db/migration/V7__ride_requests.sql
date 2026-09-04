-- A rider's request for a ride, and the cancellation policy that prices backing out of one.

CREATE TABLE ride_requests (
    id                VARCHAR(26)  PRIMARY KEY,
    rider_id          VARCHAR(26)  NOT NULL,
    ride_type_id      VARCHAR(26)  NOT NULL,

    -- What the rider agreed to. Kept so the final charge can be explained against it, and so a
    -- quote cannot be swapped for a dearer one between choosing and confirming.
    fare_estimate_id  VARCHAR(26)  NOT NULL,

    status            VARCHAR(30)  NOT NULL,

    pickup_lat        NUMERIC(9, 6) NOT NULL,
    pickup_lng        NUMERIC(9, 6) NOT NULL,
    pickup_address    VARCHAR(255),
    destination_lat   NUMERIC(9, 6) NOT NULL,
    destination_lng   NUMERIC(9, 6) NOT NULL,
    destination_address VARCHAR(255),

    currency          VARCHAR(3)   NOT NULL,
    quoted_fare_minor BIGINT       NOT NULL,

    -- Who ended it and why. Free text, because a fixed reason list makes people pick the nearest
    -- lie and the real reason is what operations needs.
    cancelled_by      VARCHAR(20),
    cancellation_reason VARCHAR(500),
    cancellation_fee_minor BIGINT,
    cancelled_at      TIMESTAMPTZ,

    requested_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Optimistic locking. A rider cancelling as dispatch assigns a driver must not both win.
    version           BIGINT       NOT NULL DEFAULT 0,

    CONSTRAINT fk_ride_requests_rider FOREIGN KEY (rider_id)
        REFERENCES rider_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_ride_requests_ride_type FOREIGN KEY (ride_type_id) REFERENCES ride_types (id),
    -- One request per estimate: a quote is consumed by the ride it becomes.
    CONSTRAINT uk_ride_requests_estimate UNIQUE (fare_estimate_id),
    CONSTRAINT fk_ride_requests_estimate FOREIGN KEY (fare_estimate_id)
        REFERENCES fare_estimates (id),
    CONSTRAINT ck_ride_requests_cancellation CHECK (
        (cancelled_at IS NULL AND cancelled_by IS NULL)
        OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL))
);

CREATE INDEX idx_ride_requests_rider ON ride_requests (rider_id, requested_at DESC);
-- Dispatch will scan for work by status; without this it table-scans every ride ever taken.
CREATE INDEX idx_ride_requests_status ON ride_requests (status, requested_at);

-- Policy as data. Cancellation terms change as often as marketing does, and a deploy per change
-- means the rules people were charged under cannot be reconstructed afterwards.
CREATE TABLE cancellation_policies (
    id                   VARCHAR(26)  PRIMARY KEY,

    cancelled_by         VARCHAR(20)  NOT NULL,
    -- The status the ride was in when it was cancelled. Backing out while still searching is not
    -- the same as backing out with a driver two minutes away.
    from_status          VARCHAR(30)  NOT NULL,

    -- Free window measured from driver assignment, not from the request: nothing has been spent
    -- on a rider's behalf until somebody is driving toward them.
    grace_seconds        INTEGER      NOT NULL DEFAULT 0,
    fee_minor            BIGINT       NOT NULL DEFAULT 0,
    currency             VARCHAR(3)   NOT NULL,

    active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uk_cancellation_policies UNIQUE (cancelled_by, from_status),
    CONSTRAINT ck_cancellation_policies_amounts CHECK (grace_seconds >= 0 AND fee_minor >= 0)
);

-- Free while nobody has been dispatched; chargeable once a driver is on the way.
INSERT INTO cancellation_policies (id, cancelled_by, from_status, grace_seconds, fee_minor, currency)
VALUES
    ('01JCANCELPOLICYREQUESTED01', 'RIDER', 'REQUESTED',       0,   0,    'INR'),
    ('01JCANCELPOLICYSEARCHING02', 'RIDER', 'SEARCHING',       0,   0,    'INR'),
    ('01JCANCELPOLICYASSIGNED003', 'RIDER', 'DRIVER_ASSIGNED', 120, 3000, 'INR'),
    ('01JCANCELPOLICYARRIVING004', 'RIDER', 'DRIVER_ARRIVING', 120, 3000, 'INR'),
    ('01JCANCELPOLICYATPICKUP005', 'RIDER', 'DRIVER_AT_PICKUP', 0,  5000, 'INR');

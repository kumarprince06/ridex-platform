-- Actor data. One account is one person; what varies is the role they act in, so identity-level
-- facts stay on users and each profile holds only what its role needs.
--
-- Two deliberate departures from docs/09-Project-ERD.md, both noted in docs/21-Gap-Tasks.md:
--
--   1. Names live on users, not on rider_profiles. The ERD gives first_name/last_name to
--      RIDER_PROFILES and nothing to DRIVER_PROFILES, which leaves a driver with no name at all.
--      A person who both rides and drives has one name, so duplicating it across two profile rows
--      would only create two places for it to disagree.
--
--   2. driver_profiles carries a single onboarding_status, not the ERD's approval_status +
--      onboarding_status pair. docs/11-State-Machines.md defines one machine whose terminal states
--      are APPROVED / REJECTED / SUSPENDED - that machine *is* the approval status. Two columns
--      encoding one machine can contradict each other.

ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name  VARCHAR(100);

-- Nullable: not collected at registration, gathered during profile setup.

CREATE TABLE rider_profiles (
    id                VARCHAR(26) PRIMARY KEY,
    user_id           VARCHAR(26) NOT NULL,

    profile_image_key VARCHAR(255),

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One rider profile per account. The same account may also hold a driver profile.
    CONSTRAINT uk_rider_profiles_user UNIQUE (user_id),
    CONSTRAINT fk_rider_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE driver_profiles (
    id                VARCHAR(26)   PRIMARY KEY,
    user_id           VARCHAR(26)   NOT NULL,

    onboarding_status VARCHAR(30)   NOT NULL,

    -- Denormalised running average over ratings, maintained when a trip is rated. Null until the
    -- driver has been rated at all, which is not the same as a rating of zero.
    rating            NUMERIC(3, 2),
    rating_count      INTEGER       NOT NULL DEFAULT 0,

    profile_image_key VARCHAR(255),

    -- Set when onboarding reaches a terminal state. Kept for the audit trail docs/14 requires.
    reviewed_at       TIMESTAMPTZ,
    reviewed_by       VARCHAR(26),
    rejection_reason  VARCHAR(500),

    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uk_driver_profiles_user UNIQUE (user_id),
    CONSTRAINT fk_driver_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_driver_profiles_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id),
    CONSTRAINT ck_driver_profiles_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_driver_profiles_onboarding_status ON driver_profiles (onboarding_status);

CREATE TABLE driver_documents (
    id             VARCHAR(26)  PRIMARY KEY,
    driver_id      VARCHAR(26)  NOT NULL,

    document_type  VARCHAR(40)  NOT NULL,
    status         VARCHAR(30)  NOT NULL,

    -- Object storage key, never a public URL: these are KYC documents and access is brokered by
    -- the application (docs/14 - never log or expose sensitive KYC material).
    storage_key    VARCHAR(255) NOT NULL,

    -- Licences and permits expire; an expired document must fail a driver's eligibility check
    -- even though it was approved when submitted.
    expires_at     TIMESTAMPTZ,

    reviewed_at    TIMESTAMPTZ,
    reviewed_by    VARCHAR(26),
    review_notes   VARCHAR(500),

    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_driver_documents_driver FOREIGN KEY (driver_id)
        REFERENCES driver_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_driver_documents_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id)
);

CREATE INDEX idx_driver_documents_driver_id ON driver_documents (driver_id);
CREATE INDEX idx_driver_documents_status    ON driver_documents (status);

CREATE TABLE driver_vehicles (
    id                  VARCHAR(26) PRIMARY KEY,
    driver_id           VARCHAR(26) NOT NULL,

    vehicle_type        VARCHAR(30) NOT NULL,
    status              VARCHAR(30) NOT NULL,

    make                VARCHAR(60) NOT NULL,
    model               VARCHAR(60) NOT NULL,
    manufacture_year    SMALLINT    NOT NULL,
    color               VARCHAR(30),
    seat_capacity       SMALLINT    NOT NULL,

    registration_number VARCHAR(20) NOT NULL,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Two drivers must never claim the same plate. This is the check that catches a vehicle being
    -- registered twice, which would otherwise let one car take two concurrent trips.
    CONSTRAINT uk_driver_vehicles_registration UNIQUE (registration_number),
    CONSTRAINT fk_driver_vehicles_driver FOREIGN KEY (driver_id)
        REFERENCES driver_profiles (id) ON DELETE CASCADE,
    -- Wide enough for a bus. A per-type bound (a hatchback is not a 7-seater) belongs in
    -- application validation, where the vehicle type is in hand - SQL would need a CASE per type.
    CONSTRAINT ck_driver_vehicles_seats CHECK (seat_capacity BETWEEN 1 AND 64)
);

CREATE INDEX idx_driver_vehicles_driver_id ON driver_vehicles (driver_id);
CREATE INDEX idx_driver_vehicles_status    ON driver_vehicles (status);

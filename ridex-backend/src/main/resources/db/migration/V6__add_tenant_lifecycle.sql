ALTER TABLE tenants
    RENAME COLUMN status TO lifecycle_status;

ALTER TABLE tenants
    ALTER COLUMN lifecycle_status SET DEFAULT 'REGISTERED';

ALTER TABLE tenants
    ADD COLUMN email_verified_at TIMESTAMP;

ALTER TABLE tenants
    ADD COLUMN onboarding_completed_at TIMESTAMP;

CREATE INDEX idx_tenants_lifecycle_status
    ON tenants(lifecycle_status);
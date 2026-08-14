-- Every timestamp column was created as TIMESTAMP WITHOUT TIME ZONE, so stored values were
-- wall-clock readings in whatever zone the writing server happened to run in (Asia/Kolkata during
-- development) with nothing recording that fact. Two identical-looking values could mean different
-- moments, and there would be no way to tell them apart afterwards.
--
-- Converting to TIMESTAMPTZ makes every column an absolute instant. Postgres does not store a zone
-- with the value; it keeps a UTC instant and converts on input/output. Rendering a local time is a
-- presentation concern, handled per tenant via tenant_business_profiles.timezone.
--
-- The USING ... AT TIME ZONE 'UTC' clause is required. Without it Postgres reinterprets existing
-- naive values in the session timezone, silently shifting them. All tables are empty when this runs,
-- but the clause keeps the migration correct if it is ever replayed against populated data.

ALTER TABLE tenants
    ALTER COLUMN created_at              TYPE TIMESTAMPTZ USING created_at              AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at              TYPE TIMESTAMPTZ USING updated_at              AT TIME ZONE 'UTC',
    ALTER COLUMN email_verified_at       TYPE TIMESTAMPTZ USING email_verified_at       AT TIME ZONE 'UTC',
    ALTER COLUMN onboarding_completed_at TYPE TIMESTAMPTZ USING onboarding_completed_at AT TIME ZONE 'UTC';

ALTER TABLE users
    ALTER COLUMN email_verified_at TYPE TIMESTAMPTZ USING email_verified_at AT TIME ZONE 'UTC',
    ALTER COLUMN last_login_at     TYPE TIMESTAMPTZ USING last_login_at     AT TIME ZONE 'UTC',
    ALTER COLUMN created_at        TYPE TIMESTAMPTZ USING created_at        AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at        TYPE TIMESTAMPTZ USING updated_at        AT TIME ZONE 'UTC';

ALTER TABLE tenant_users
    ALTER COLUMN joined_at  TYPE TIMESTAMPTZ USING joined_at  AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE tenant_business_profiles
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE email_verification_tokens
    ALTER COLUMN expires_at  TYPE TIMESTAMPTZ USING expires_at  AT TIME ZONE 'UTC',
    ALTER COLUMN verified_at TYPE TIMESTAMPTZ USING verified_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at  TYPE TIMESTAMPTZ USING created_at  AT TIME ZONE 'UTC';

ALTER TABLE subscription_plans
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE tenant_subscriptions
    ALTER COLUMN started_at           TYPE TIMESTAMPTZ USING started_at           AT TIME ZONE 'UTC',
    ALTER COLUMN current_period_start TYPE TIMESTAMPTZ USING current_period_start AT TIME ZONE 'UTC',
    ALTER COLUMN current_period_end   TYPE TIMESTAMPTZ USING current_period_end   AT TIME ZONE 'UTC',
    ALTER COLUMN trial_start_at       TYPE TIMESTAMPTZ USING trial_start_at       AT TIME ZONE 'UTC',
    ALTER COLUMN trial_end_at         TYPE TIMESTAMPTZ USING trial_end_at         AT TIME ZONE 'UTC',
    ALTER COLUMN cancelled_at         TYPE TIMESTAMPTZ USING cancelled_at         AT TIME ZONE 'UTC',
    ALTER COLUMN created_at           TYPE TIMESTAMPTZ USING created_at           AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at           TYPE TIMESTAMPTZ USING updated_at           AT TIME ZONE 'UTC';

ALTER TABLE subscription_payments
    ALTER COLUMN initiated_at TYPE TIMESTAMPTZ USING initiated_at AT TIME ZONE 'UTC',
    ALTER COLUMN completed_at TYPE TIMESTAMPTZ USING completed_at AT TIME ZONE 'UTC',
    ALTER COLUMN refunded_at  TYPE TIMESTAMPTZ USING refunded_at  AT TIME ZONE 'UTC',
    ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at   TYPE TIMESTAMPTZ USING updated_at   AT TIME ZONE 'UTC';

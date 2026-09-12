-- The two accounts a demo is walked with, and the state they need to be usable.
--
-- Not a Flyway migration: migrations run everywhere, and an account with a published password has
-- no business existing in a real deployment. Run it against a demo database only.
--
--   psql -h localhost -U ridex_app -d ridex_platform -f demo-accounts.sql
--
-- Both passwords are Ridex@2026. The hash below is BCrypt cost 12, the same encoder the
-- application signs up with, so these accounts log in through the ordinary path - no back door.
--
-- Re-runnable: it owns the two yopmail addresses and rewrites them.
--
-- yopmail on purpose: the inbox is public and needs no signup, so a verification code, a receipt
-- and a shuttle invoice can all be opened in front of whoever is watching the demo.

BEGIN;

-- ---------------------------------------------------------------- the rider
INSERT INTO users (id, email, password_hash, status, email_verified_at, first_name, last_name, phone)
VALUES ('demo00000000000000000rider', 'ridex-rider@yopmail.com',
        '$2a$12$7F48qvhaehfDTFc4l4X6UeYc2XrTtvYizZ.9k26xZCF71NFmro4ru',
        'ACTIVE', now(), 'Demo', 'Rider', '+919000000001')
ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        status = 'ACTIVE',
        email_verified_at = now();

INSERT INTO user_roles (user_id, role)
SELECT id, 'RIDER' FROM users WHERE email = 'ridex-rider@yopmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO rider_profiles (id, user_id)
SELECT 'demo0000000000riderprofile', id FROM users WHERE email = 'ridex-rider@yopmail.com'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------- the driver
INSERT INTO users (id, email, password_hash, status, email_verified_at, first_name, last_name, phone)
VALUES ('demo0000000000000000driver', 'ridex-driver@yopmail.com',
        '$2a$12$7F48qvhaehfDTFc4l4X6UeYc2XrTtvYizZ.9k26xZCF71NFmro4ru',
        'ACTIVE', now(), 'Demo', 'Driver', '+919000000002')
ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        status = 'ACTIVE',
        email_verified_at = now();

INSERT INTO user_roles (user_id, role)
SELECT id, 'DRIVER' FROM users WHERE email = 'ridex-driver@yopmail.com'
ON CONFLICT DO NOTHING;

-- Approved, because an unapproved driver cannot go on duty and the demo stops at the first screen.
INSERT INTO driver_profiles (id, user_id, onboarding_status, reviewed_at)
SELECT 'demo000000000driverprofile', id, 'APPROVED', now()
FROM users WHERE email = 'ridex-driver@yopmail.com'
ON CONFLICT (user_id) DO UPDATE
    SET onboarding_status = 'APPROVED', reviewed_at = now();

-- Eligibility is three things, not one: approval, valid documents, and an active vehicle. Seeding
-- only the first leaves "go on duty" refusing with a message nobody can act on in a demo.
INSERT INTO driver_documents (id, driver_id, document_type, status, storage_key, expires_at, reviewed_at)
SELECT 'demo0000000000000000000dl1', p.id, 'DRIVING_LICENCE', 'APPROVED', 'demo/driving-licence',
       now() + interval '2 years', now()
FROM driver_profiles p JOIN users u ON u.id = p.user_id WHERE u.email = 'ridex-driver@yopmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO driver_documents (id, driver_id, document_type, status, storage_key, expires_at, reviewed_at)
SELECT 'demo0000000000000000000id1', p.id, 'IDENTITY_PROOF', 'APPROVED', 'demo/identity-proof',
       now() + interval '2 years', now()
FROM driver_profiles p JOIN users u ON u.id = p.user_id WHERE u.email = 'ridex-driver@yopmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO driver_vehicles (id, driver_id, vehicle_type, status, make, model, manufacture_year,
                             color, seat_capacity, registration_number)
SELECT 'demo00000000000000vehicle1', p.id, 'SEDAN', 'ACTIVE', 'Maruti', 'Dzire', 2022, 'White', 4,
       'WB01DEMO1'
FROM driver_profiles p JOIN users u ON u.id = p.user_id WHERE u.email = 'ridex-driver@yopmail.com'
ON CONFLICT DO NOTHING;

COMMIT;

-- 2,500 approved, on-duty drivers for the location load test. Run after the app has started
-- once, so Flyway has built the schema. Safe to run again.
--
-- Ids are deterministic (PERFUSR/PERFDRV + the k6 VU number, padded to 26) so the k6 script can
-- sign a token for its driver without a lookup. The password hash matches nothing: these
-- accounts cannot log in, they only exist behind tokens the perf run signs itself.

INSERT INTO users (id, email, password_hash, status, first_name, last_name, email_verified_at)
SELECT 'PERFUSR' || lpad(n::text, 19, '0'),
       'perf-driver-' || n || '@ridex.test',
       '!perf-no-login',
       'ACTIVE',
       'Perf',
       'Driver ' || n,
       now()
FROM generate_series(1, 2500) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT 'PERFUSR' || lpad(n::text, 19, '0'), 'DRIVER'
FROM generate_series(1, 2500) AS n
ON CONFLICT DO NOTHING;

-- On duty, or every ping is ignored before it reaches Redis and the test measures nothing.
INSERT INTO driver_profiles (id, user_id, onboarding_status, on_duty, duty_changed_at)
SELECT 'PERFDRV' || lpad(n::text, 19, '0'),
       'PERFUSR' || lpad(n::text, 19, '0'),
       'APPROVED',
       TRUE,
       now()
FROM generate_series(1, 2500) AS n
ON CONFLICT (id) DO UPDATE SET on_duty = TRUE;

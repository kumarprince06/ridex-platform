-- Demo data: the two Kolkata commuter corridors, both ways.
--
-- Not a Flyway migration on purpose. Migrations run everywhere including production, and a bus
-- that does not exist has no business appearing there. Run this by hand against a dev database:
--   psql -h localhost -U ridex_app -d ridex_platform -f kolkata-shuttle.sql
--
-- Re-runnable: everything it owns is keyed off the KOL- route codes and the seed@ridex.local
-- driver addresses, and it clears those before writing them again.

BEGIN;

-- ---------------------------------------------------------------- clear the previous seed
CREATE TEMP TABLE seeded_routes ON COMMIT DROP AS
    SELECT id FROM routes WHERE code LIKE 'KOL-%';

DELETE FROM shuttle_bookings WHERE shuttle_trip_id IN (
    SELECT t.id FROM shuttle_trips t
    JOIN shuttle_schedules s ON s.id = t.schedule_id
    WHERE s.route_id IN (SELECT id FROM seeded_routes));
DELETE FROM shuttle_trips WHERE schedule_id IN (
    SELECT id FROM shuttle_schedules WHERE route_id IN (SELECT id FROM seeded_routes));
DELETE FROM shuttle_schedules WHERE route_id IN (SELECT id FROM seeded_routes);
DELETE FROM route_fares WHERE route_id IN (SELECT id FROM seeded_routes);
DELETE FROM route_stops WHERE route_id IN (SELECT id FROM seeded_routes);
DELETE FROM routes WHERE id IN (SELECT id FROM seeded_routes);

DELETE FROM driver_vehicles WHERE driver_id IN (
    SELECT d.id FROM driver_profiles d JOIN users u ON u.id = d.user_id
    WHERE u.email LIKE 'seed.%@ridex.local');
DELETE FROM driver_profiles WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'seed.%@ridex.local');
DELETE FROM users WHERE email LIKE 'seed.%@ridex.local';

-- Integration tests have been run against this database, leaving thirty-odd identical
-- "Whitefield to Electronic City" routes in front of every real one. Deactivated, not deleted:
-- they still have trips hanging off them.
UPDATE routes SET active = FALSE
 WHERE name = 'Whitefield to Electronic City'
    OR code = 'R2371';

-- ---------------------------------------------------------------- drivers and their vehicles
-- Password for all three is Driver@123, so the partner app can sign in as any of them.
WITH new_users AS (
    INSERT INTO users (id, email, phone, password_hash, status, email_verified_at,
                       first_name, last_name)
    VALUES
      ('01SEEDDRV000000000000000B1', 'seed.bus1@ridex.local', '+919830000101',
       '$2a$12$/BWd20RboHrOnpPRvY7f1uBHwigNYEhv.JUbhb/qVVRmMoGrHfNsy', 'ACTIVE', now(),
       'Sujoy', 'Mondal'),
      ('01SEEDDRV000000000000000B2', 'seed.bus2@ridex.local', '+919830000102',
       '$2a$12$/BWd20RboHrOnpPRvY7f1uBHwigNYEhv.JUbhb/qVVRmMoGrHfNsy', 'ACTIVE', now(),
       'Rakesh', 'Das'),
      ('01SEEDDRV000000000000000T1', 'seed.trav1@ridex.local', '+919830000103',
       '$2a$12$/BWd20RboHrOnpPRvY7f1uBHwigNYEhv.JUbhb/qVVRmMoGrHfNsy', 'ACTIVE', now(),
       'Imran', 'Sheikh')
    RETURNING id
)
INSERT INTO user_roles (user_id, role) SELECT id, 'DRIVER' FROM new_users;

INSERT INTO driver_profiles (id, user_id, onboarding_status, rating, rating_count, on_duty)
VALUES
  ('01SEEDDRVPROF00000000000B1', '01SEEDDRV000000000000000B1', 'APPROVED', 4.80, 214, TRUE),
  ('01SEEDDRVPROF00000000000B2', '01SEEDDRV000000000000000B2', 'APPROVED', 4.60, 158, TRUE),
  ('01SEEDDRVPROF00000000000T1', '01SEEDDRV000000000000000T1', 'APPROVED', 4.90, 402, TRUE);

INSERT INTO driver_vehicles (id, driver_id, vehicle_type, status, make, model,
                             manufacture_year, color, seat_capacity, registration_number)
VALUES
  -- 40 seats, 2+2 across.
  ('01SEEDVEH00000000000000B1', '01SEEDDRVPROF00000000000B1', 'BUS', 'ACTIVE',
   'Tata', 'Starbus Ultra', 2023, 'Mint', 40, 'WB19RX4001'),
  ('01SEEDVEH00000000000000B2', '01SEEDDRVPROF00000000000B2', 'BUS', 'ACTIVE',
   'Ashok Leyland', 'Falcon', 2022, 'White', 40, 'WB19RX4002'),
  -- 22 seats, 2+1 across, which is what makes the seat picker label rows A-C.
  ('01SEEDVEH00000000000000T1', '01SEEDDRVPROF00000000000T1', 'MINIBUS', 'ACTIVE',
   'Force', 'Traveller 26', 2024, 'Silver', 22, 'WB19RX2201');

-- ---------------------------------------------------------------- routes
INSERT INTO routes (id, code, name, description, active) VALUES
  ('01SEEDROUTE0000000BLYSV001', 'KOL-BLY-SV', 'Bally Halt to Sector V',
   'Morning commuter run down the Dunlop - Nagerbazar - Kestopur corridor.', TRUE),
  ('01SEEDROUTE0000000SVBLY001', 'KOL-SV-BLY', 'Sector V to Bally Halt',
   'The evening return, same corridor the other way.', TRUE),
  ('01SEEDROUTE0000000HWMSV001', 'KOL-HWM-SV', 'Howrah Maidan to Sector V',
   'Across the river and along the Esplanade - Sealdah - Salt Lake corridor.', TRUE),
  ('01SEEDROUTE0000000SVHWM001', 'KOL-SV-HWM', 'Sector V to Howrah Maidan',
   'The evening return to Howrah Maidan metro.', TRUE);

-- Stops, written once in travel order per corridor. The return route is the same list reversed,
-- with the offsets mirrored - a rider going home passes the same stops in the other order.
CREATE TEMP TABLE seed_stops (corridor TEXT, seq SMALLINT, name TEXT, lat NUMERIC(9,6),
                              lng NUMERIC(9,6), mins SMALLINT) ON COMMIT DROP;

INSERT INTO seed_stops VALUES
  ('BLYSV',  1, 'Bally Halt Bus Stop',        22.650800, 88.340600,  0),
  ('BLYSV',  2, 'Bally Khal',                 22.645000, 88.352000,  6),
  ('BLYSV',  3, 'Nivedita Setu Toll Plaza',   22.656000, 88.355600, 12),
  ('BLYSV',  4, 'Dakshineswar Temple',        22.655300, 88.357500, 16),
  ('BLYSV',  5, 'Alambazar',                  22.650000, 88.365000, 21),
  ('BLYSV',  6, 'Dunlop More',                22.649000, 88.377000, 26),
  ('BLYSV',  7, 'Baranagar Bazar',            22.643000, 88.383000, 31),
  ('BLYSV',  8, 'Sinthee More',               22.628000, 88.390000, 37),
  ('BLYSV',  9, 'Dum Dum Junction',           22.621700, 88.409200, 44),
  ('BLYSV', 10, 'Nagerbazar',                 22.626000, 88.416000, 50),
  ('BLYSV', 11, 'Lake Town',                  22.606000, 88.411000, 56),
  ('BLYSV', 12, 'Baguiati Crossing',          22.616000, 88.432000, 62),
  ('BLYSV', 13, 'Kestopur',                   22.598000, 88.429000, 68),
  ('BLYSV', 14, 'College More Sector V',      22.583000, 88.431000, 74),
  ('BLYSV', 15, 'Technopolis',                22.577000, 88.436000, 79),
  ('BLYSV', 16, 'Sector V Metro Station',     22.575800, 88.433700, 84),

  ('HWMSV',  1, 'Howrah Maidan Metro',        22.583900, 88.330500,  0),
  ('HWMSV',  2, 'Howrah Station Bus Terminus',22.583400, 88.342200,  7),
  ('HWMSV',  3, 'Burrabazar',                 22.585300, 88.347000, 13),
  ('HWMSV',  4, 'M G Road',                   22.578000, 88.354000, 19),
  ('HWMSV',  5, 'Chandni Chowk',              22.567000, 88.352000, 25),
  ('HWMSV',  6, 'Esplanade',                  22.563000, 88.351000, 30),
  ('HWMSV',  7, 'Sealdah Station',            22.567500, 88.372000, 38),
  ('HWMSV',  8, 'Phoolbagan',                 22.573000, 88.390000, 45),
  ('HWMSV',  9, 'Beleghata Crossing',         22.564000, 88.396000, 50),
  ('HWMSV', 10, 'Salt Lake Stadium',          22.572000, 88.403000, 56),
  ('HWMSV', 11, 'Bengal Chemical',            22.573000, 88.411000, 61),
  ('HWMSV', 12, 'City Centre Salt Lake',      22.578000, 88.418000, 66),
  ('HWMSV', 13, 'Central Park',               22.580000, 88.423000, 70),
  ('HWMSV', 14, 'Karunamoyee',                22.579000, 88.427000, 74),
  ('HWMSV', 15, 'College More Sector V',      22.583000, 88.431000, 79),
  ('HWMSV', 16, 'Sector V Metro Station',     22.575800, 88.433700, 84);

-- Outbound: the list as written.
INSERT INTO route_stops (id, route_id, sequence, name, latitude, longitude, offset_minutes)
SELECT upper(substr(md5(r.id || s.corridor || s.seq::text), 1, 26)),
       r.id, s.seq, s.name, s.lat, s.lng, s.mins
FROM seed_stops s
JOIN routes r ON r.id = CASE s.corridor WHEN 'BLYSV' THEN '01SEEDROUTE0000000BLYSV001'
                                        ELSE '01SEEDROUTE0000000HWMSV001' END;

-- Return: same stops, order reversed, offsets measured from the new first stop.
INSERT INTO route_stops (id, route_id, sequence, name, latitude, longitude, offset_minutes)
SELECT upper(substr(md5(r.id || s.corridor || 'R' || s.seq::text), 1, 26)),
       r.id,
       (17 - s.seq)::SMALLINT,
       s.name, s.lat, s.lng,
       (84 - s.mins)::SMALLINT
FROM seed_stops s
JOIN routes r ON r.id = CASE s.corridor WHEN 'BLYSV' THEN '01SEEDROUTE0000000SVBLY001'
                                        ELSE '01SEEDROUTE0000000SVHWM001' END;

-- Every forward stop pair, priced by how far along the route it goes: ₹10 to board, ₹5 a stop.
-- Published in advance and identical every day, which is the point of a commuter route.
INSERT INTO route_fares (id, route_id, from_stop_id, to_stop_id, currency, fare_minor)
SELECT upper(substr(md5(f.id || t.id), 1, 26)), f.route_id, f.id, t.id, 'INR',
       1000 + 500 * (t.sequence - f.sequence)
FROM route_stops f
JOIN route_stops t ON t.route_id = f.route_id AND t.sequence > f.sequence
WHERE f.route_id IN (SELECT id FROM routes WHERE code LIKE 'KOL-%');

-- ---------------------------------------------------------------- timetable
-- Peak departures out in the morning and back in the evening, Monday to Saturday. The crew is on
-- the schedule, so a rider booking the first seat still sees who is driving and what to look for.
--
-- Times are written IST and stored UTC, because that is what the app does with them:
-- hibernate.jdbc.time_zone is UTC, so a schedule saved through the admin API as 07:15 lands in
-- this column as 01:45 and reads back as 07:15. Inserting IST here directly would show every
-- departure five and a half hours late.
INSERT INTO shuttle_schedules (id, route_id, departure_time, days_of_week, seat_capacity,
                               seats_per_row, driver_id, vehicle_id, active)
VALUES
  -- Bally Halt -> Sector V: two buses and the Traveller.
  ('01SEEDSCHED000000BLYSV0715', '01SEEDROUTE0000000BLYSV001', ('07:15'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 40, 4,
   '01SEEDDRVPROF00000000000B1', '01SEEDVEH00000000000000B1', TRUE),
  ('01SEEDSCHED000000BLYSV0815', '01SEEDROUTE0000000BLYSV001', ('08:15'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 40, 4,
   '01SEEDDRVPROF00000000000B2', '01SEEDVEH00000000000000B2', TRUE),
  ('01SEEDSCHED000000BLYSV0915', '01SEEDROUTE0000000BLYSV001', ('09:15'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 22, 3,
   '01SEEDDRVPROF00000000000T1', '01SEEDVEH00000000000000T1', TRUE),

  ('01SEEDSCHED000000SVBLY1730', '01SEEDROUTE0000000SVBLY001', ('17:30'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 40, 4,
   '01SEEDDRVPROF00000000000B1', '01SEEDVEH00000000000000B1', TRUE),
  ('01SEEDSCHED000000SVBLY1830', '01SEEDROUTE0000000SVBLY001', ('18:30'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 40, 4,
   '01SEEDDRVPROF00000000000B2', '01SEEDVEH00000000000000B2', TRUE),
  ('01SEEDSCHED000000SVBLY1930', '01SEEDROUTE0000000SVBLY001', ('19:30'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 22, 3,
   '01SEEDDRVPROF00000000000T1', '01SEEDVEH00000000000000T1', TRUE),

  ('01SEEDSCHED000000HWMSV0745', '01SEEDROUTE0000000HWMSV001', ('07:45'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 40, 4,
   '01SEEDDRVPROF00000000000B2', '01SEEDVEH00000000000000B2', TRUE),
  ('01SEEDSCHED000000HWMSV0845', '01SEEDROUTE0000000HWMSV001', ('08:45'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 22, 3,
   '01SEEDDRVPROF00000000000T1', '01SEEDVEH00000000000000T1', TRUE),
  ('01SEEDSCHED000000HWMSV0945', '01SEEDROUTE0000000HWMSV001', ('09:45'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 40, 4,
   '01SEEDDRVPROF00000000000B1', '01SEEDVEH00000000000000B1', TRUE),

  ('01SEEDSCHED000000SVHWM1745', '01SEEDROUTE0000000SVHWM001', ('17:45'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 40, 4,
   '01SEEDDRVPROF00000000000B2', '01SEEDVEH00000000000000B2', TRUE),
  ('01SEEDSCHED000000SVHWM1845', '01SEEDROUTE0000000SVHWM001', ('18:45'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 22, 3,
   '01SEEDDRVPROF00000000000T1', '01SEEDVEH00000000000000T1', TRUE),
  ('01SEEDSCHED000000SVHWM1945', '01SEEDROUTE0000000SVHWM001', ('19:45'::time - interval '5 hours 30 minutes'), '1,2,3,4,5,6', 40, 4,
   '01SEEDDRVPROF00000000000B1', '01SEEDVEH00000000000000B1', TRUE);

COMMIT;

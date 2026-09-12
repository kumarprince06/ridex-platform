#!/usr/bin/env bash
# Puts a DEMO database back to the state it starts in.
#
# Only useful when the same walkthrough is given repeatedly: the last demo leaves seat 3A boarded,
# a driver on duty, points spent and a support ticket open, and the next one starts mid-story. It
# clears what people did - rides, bookings, payments, tickets, notifications - and rebuilds the
# city and the two demo accounts.
#
# It is never for an environment with real users in it. Rides, invoices and payouts are somebody's
# record of what happened; this deletes them. The guard below refuses to run when it finds accounts
# that are not demo accounts, because "which host am I on" is a question everybody gets wrong once.
#
#   ./demo-reset.sh                      # against the compose deployment on this host
#   DATABASE="psql -h localhost -U ridex_app -d ridex_platform" ./demo-reset.sh   # local
set -euo pipefail
cd "$(dirname "$0")"

DATABASE=${DATABASE:-"docker compose -f docker-compose.prod.yml exec -T postgres psql -U ridex_app -d ridex_platform"}

# ---------------------------------------------------------------- refuse to wipe a real database
REAL_ACCOUNTS=$($DATABASE -t -A -c "
    SELECT count(*) FROM users
    WHERE email NOT LIKE '%@yopmail.com'
      AND email NOT LIKE '%@example.com'
      AND email NOT LIKE '%@ridex.local'" | tr -d '[:space:]')

if [ "${REAL_ACCOUNTS:-0}" -gt 0 ] && [ "${FORCE:-}" != "yes-delete-everything" ]; then
    echo "Refusing: this database has $REAL_ACCOUNTS account(s) that are not demo accounts." >&2
    echo "Their rides, invoices and payouts would go with them." >&2
    echo "If this really is a demo host, re-run with FORCE=yes-delete-everything" >&2
    exit 1
fi

echo "Clearing what the last demo did..."
$DATABASE <<'SQL'
BEGIN;

-- Order matters only where a foreign key has no cascade; TRUNCATE ... CASCADE handles the rest in
-- one statement and resets the tables far faster than a DELETE per row.
TRUNCATE
    ride_offers, trip_status_history, trip_fare_lines, trip_locations, trips,
    ride_ratings, fare_estimate_lines, fare_estimates, ride_requests,
    shuttle_bookings, shuttle_trips, passes,
    payments, payment_events, refunds, rider_dues, driver_earnings, driver_payouts, ledger_entries,
    point_entries, referrals,
    support_messages, support_tickets,
    notification_outbox, user_notifications, notification_preferences,
    auth_events, audit_logs
CASCADE;

-- A driver left on duty from the last demo would be offered the first ride of the next one before
-- anybody has opened the app.
UPDATE driver_profiles SET on_duty = FALSE, duty_changed_at = now();

COMMIT;
SQL

echo "Re-seeding the city and the demo accounts..."
$DATABASE < ../ridex-backend/src/main/resources/seed/kolkata-shuttle.sql
$DATABASE < demo-accounts.sql

echo "Done. ridex-rider@yopmail.com and ridex-driver@yopmail.com, password Ridex@2026."

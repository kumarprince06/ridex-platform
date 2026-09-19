#!/usr/bin/env bash
# Screen tests for the console, end to end: a throwaway backend (port 8090) and console (5175) on
# the test database, Playwright against them, then both stopped. Your own servers on 8080/5174 and
# your own database are never touched.
#
#   npm run e2e                 # everything
#   npm run e2e -- shuttle      # just the specs matching "shuttle"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
set -a; . ./.env; set +a

TEST_DB=${RIDEX_TEST_DB:-ridex_platform_test}
LOGS="$ROOT/ridex-admin-web/e2e/.logs"
mkdir -p "$LOGS"
export PGPASSWORD="$RIDEX_APP_PASSWORD"

echo "Resetting $TEST_DB..."
psql -h localhost -U ridex_app -d "$TEST_DB" -q -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Building the backend..."
(cd ridex-backend && ./mvnw -q -DskipTests package)
JAR=$(ls ridex-backend/target/ridex-backend-*.jar | grep -v plain | head -1)

for port in 8090 5175; do
  if ss -ltn | grep -q ":$port "; then echo "Port $port is already in use; stop whatever is on it first." >&2; exit 1; fi
done

cleanup() {
  [ -n "${BACKEND:-}" ] && kill "$BACKEND" 2>/dev/null || true
  pkill -f "vite --port 5175" 2>/dev/null || true
}
trap cleanup EXIT

SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/$TEST_DB" \
SPRING_DATA_REDIS_DATABASE=1 \
RIDEX_PORT=8090 \
RIDEX_CORS_ALLOWED_ORIGINS=http://localhost:5175 \
RIDEX_BOOTSTRAP_ADMIN_EMAIL=e2e-admin@ridex.test \
RIDEX_BOOTSTRAP_ADMIN_PASSWORD='E2e-Admin-2026' \
RIDEX_MAIL_ECHO=true \
  java -jar "$JAR" > "$LOGS/backend.log" 2>&1 &
BACKEND=$!

(cd ridex-admin-web && VITE_API_BASE_URL=http://localhost:8090 npx vite --port 5175 --strictPort > "$LOGS/console.log" 2>&1) &
CONSOLE=$!

echo "Waiting for the test backend..."
for _ in $(seq 1 90); do
  curl -sf http://localhost:8090/actuator/health >/dev/null && break
  sleep 2
done
curl -sf http://localhost:8090/actuator/health >/dev/null || { echo "Backend did not start; see $LOGS/backend.log"; exit 1; }

cd ridex-admin-web
npx playwright test "$@"

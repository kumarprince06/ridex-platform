#!/usr/bin/env bash
# Starts the backend with everything in .env exported.
#
# Spring does not read .env - only Docker Compose does - so without this the same eight variables
# have to be exported by hand every time, and the one that gets forgotten is the mail password.
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
else
  echo "No .env - copy .env.example to .env and fill it in." >&2
  exit 1
fi

exec ./ridex-backend/mvnw -f ridex-backend/pom.xml spring-boot:run

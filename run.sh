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

# The project is built for Java 21. A machine with an older JAVA_HOME pinned in its shell profile
# compiles fine and then fails at startup with UnsupportedClassVersionError, which reads like a
# code problem and is not one - so the runtime is chosen here rather than left to the shell.
if [ -z "${JAVA_HOME:-}" ] || ! "${JAVA_HOME}/bin/java" -version 2>&1 | grep -q '"21'; then
  for candidate in /usr/lib/jvm/java-21-openjdk-amd64 /usr/lib/jvm/java-1.21.0-openjdk-amd64; do
    if [ -x "$candidate/bin/java" ]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi

exec ./ridex-backend/mvnw -f ridex-backend/pom.xml spring-boot:run

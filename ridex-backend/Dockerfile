# Build and run the backend.
#
# Two stages because the JDK, Maven and the whole dependency cache have no business in production:
# the runtime image carries a JRE and one jar. Layers are ordered so a code change does not
# re-download the internet - dependencies resolve from the POM alone and stay cached until it moves.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

COPY pom.xml .
RUN mvn --batch-mode dependency:go-offline

COPY src ./src
# Tests run in CI against a real Postgres and Redis; repeating them here would need both inside
# the build and still prove less.
RUN mvn --batch-mode -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Nothing here needs root. An application that is compromised should not also own its filesystem.
# The documents dir is created and owned here so the volume mounted over it inherits ridex, not root.
RUN addgroup -S ridex && adduser -S ridex -G ridex \
    && mkdir -p /var/ridex/documents && chown -R ridex:ridex /var/ridex
USER ridex

COPY --from=build --chown=ridex:ridex /build/target/*.jar app.jar

# The container's own answer to "are you alive", so the platform restarts a wedged JVM rather than
# leaving it listening and useless.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"'

EXPOSE 8080

# Container-aware by default on 21: the JVM reads the cgroup limit rather than the host's RAM.
# MaxRAMPercentage leaves room for metaspace, threads and the OS inside a small box.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]

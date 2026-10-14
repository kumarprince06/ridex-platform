package com.ridex.location;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.util.List;
import java.util.Properties;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.ridex.IntegrationTest;

/** The pins the rider's map, the shuttle ticket and the ops map are all drawn from. */
@IntegrationTest
class DriverPresenceTest {

    // Somewhere no other test puts a driver, so nearby() here only ever sees this file's pins.
    private static final double LAT = -33.8688;
    private static final double LNG = 151.2093;

    @Autowired private DriverPresence driverPresence;
    @Autowired private StringRedisTemplate redis;

    @Test
    void aReportedDriverCanBeFoundAgainAndDisappearsWhenTheyGoOffDuty() {
        String driverId = "presence-" + System.nanoTime();

        driverPresence.report(driverId, 12.9716, 77.5946);

        var at = driverPresence.positionOf(driverId).orElseThrow();
        // Redis geohashes the point, so it comes back within metres rather than bit-identical.
        assertThat(at.latitude()).isCloseTo(12.9716, within(0.001));
        assertThat(at.longitude()).isCloseTo(77.5946, within(0.001));

        driverPresence.goOffDuty(driverId);

        // Off duty is off the map: a marker nobody is behind is worse than no marker.
        assertThat(driverPresence.positionOf(driverId)).isEmpty();
    }

    @Test
    void aDriverWhoNeverReportedHasNoPosition() {
        assertThat(driverPresence.positionOf("nobody-" + System.nanoTime())).isEmpty();
    }

    @Test
    void aStalePinIsSkippedAndDoesNotTakeAFreshDriversPlace() {
        String stale = "stale-" + System.nanoTime();
        String fresh = "fresh-" + System.nanoTime();
        // The stale pin is the nearer one: nearest-first must not hand dispatch a dead phone.
        driverPresence.report(stale, LAT, LNG);
        driverPresence.report(fresh, LAT + 0.002, LNG);
        lastPingedLongAgo(stale);

        assertThat(driverPresence.nearby(LAT, LNG, 1000, 1)).containsExactly(fresh);
        assertThat(driverPresence.positionOf(stale)).isEmpty();

        driverPresence.goOffDuty(fresh);
        driverPresence.goOffDuty(stale);
    }

    @Test
    void evictionClearsStaleAndOrphanedPinsFromBothSetsAndKeepsLiveOnes() {
        String stale = "stale-" + System.nanoTime();
        String orphan = "orphan-" + System.nanoTime();
        String live = "live-" + System.nanoTime();
        driverPresence.report(stale, LAT, LNG);
        driverPresence.report(live, LAT, LNG);
        lastPingedLongAgo(stale);
        // A pin whose freshness write never landed.
        redis.opsForGeo().add("drivers:online", new org.springframework.data.geo.Point(LNG, LAT), orphan);

        assertThat(driverPresence.evictStale()).isGreaterThanOrEqualTo(2);

        assertThat(redis.opsForZSet().score("drivers:online", stale)).isNull();
        assertThat(redis.opsForZSet().score("drivers:seen", stale)).isNull();
        assertThat(redis.opsForZSet().score("drivers:online", orphan)).isNull();
        assertThat(driverPresence.positionOf(live)).isPresent();

        driverPresence.goOffDuty(live);
    }

    @Test
    void aNearbySearchCostsTwoRoundTripsHoweverManyDriversItFinds() {
        List<String> drivers = IntStream.range(0, 12)
                .mapToObj(i -> "crowd-" + i + "-" + System.nanoTime())
                .toList();
        drivers.forEach(id -> driverPresence.report(id, LAT, LNG));

        long searchesBefore = calls("geosearch");
        long scoresBefore = calls("zmscore");
        long existsBefore = calls("exists");

        assertThat(driverPresence.nearby(LAT, LNG, 1000, 12)).hasSize(12);

        assertThat(calls("geosearch") - searchesBefore).isEqualTo(1);
        assertThat(calls("zmscore") - scoresBefore).isEqualTo(1);
        // The old read made one of these per driver.
        assertThat(calls("exists") - existsBefore).isZero();

        drivers.forEach(driverPresence::goOffDuty);
    }

    private void lastPingedLongAgo(String driverId) {
        long longAgo = System.currentTimeMillis() - DriverPresence.STALE_AFTER.toMillis() - 60_000;
        redis.opsForZSet().add("drivers:seen", driverId, longAgo);
    }

    // Redis's own count of a command, from INFO commandstats: "calls=12,usec=...".
    private long calls(String command) {
        Properties stats = redis.execute(
                (RedisCallback<Properties>) connection -> connection.serverCommands().info("commandstats"));
        String line = stats == null ? null : stats.getProperty("cmdstat_" + command);
        return line == null ? 0 : Long.parseLong(line.split(",")[0].substring("calls=".length()));
    }
}

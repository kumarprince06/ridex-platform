package com.ridex.location;

import java.time.Duration;
import java.util.List;

import org.springframework.data.geo.Circle;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Where the on-duty drivers are, in Redis.
 *
 * <p>A position ping every few seconds from every on-duty driver is a write rate PostgreSQL should
 * never see, and its value expires in seconds. Losing Redis costs the last few pings and nothing
 * else - drivers re-register on their next one.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DriverPresence {

    private static final String ONLINE_KEY = "drivers:online";

    // A driver whose app died leaves a stale pin. Anything older than this is not really there.
    private static final Duration STALE_AFTER = Duration.ofMinutes(2);

    private final StringRedisTemplate redis;

    public void report(String driverId, double latitude, double longitude) {
        redis.opsForGeo().add(ONLINE_KEY, new Point(longitude, latitude), driverId);
        // Freshness is tracked separately: Redis geo sets have no per-member TTL.
        redis.opsForValue().set(seenKey(driverId), "1", STALE_AFTER);
    }

    public void goOffDuty(String driverId) {
        redis.opsForGeo().remove(ONLINE_KEY, driverId);
        redis.delete(seenKey(driverId));
    }

    /** Driver ids within the radius, nearest first, stale pins dropped. */
    public List<String> nearby(double latitude, double longitude, double radiusMeters, int limit) {
        // Metrics has no METERS: kilometres is the finest unit Spring Data models here.
        Circle area = new Circle(
                new Point(longitude, latitude),
                new Distance(radiusMeters / 1000.0, Metrics.KILOMETERS));

        var results = redis.opsForGeo().radius(
                ONLINE_KEY,
                area,
                RedisGeoCommands.GeoRadiusCommandArgs.newGeoRadiusArgs()
                        .includeDistance()
                        .sortAscending()
                        .limit(limit));

        if (results == null) {
            return List.of();
        }

        return results.getContent().stream()
                .map(result -> result.getContent().getName())
                .filter(driverId -> Boolean.TRUE.equals(redis.hasKey(seenKey(driverId))))
                .toList();
    }

    private static String seenKey(String driverId) {
        return "drivers:seen:" + driverId;
    }
}

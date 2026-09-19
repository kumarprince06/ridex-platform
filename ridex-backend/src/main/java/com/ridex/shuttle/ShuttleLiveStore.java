package com.ridex.shuttle;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Where a running shuttle is right now. Redis, not Postgres: it changes every few seconds and only
 * the latest value matters. Kept apart from DriverPresence so a shuttle driver isn't offered rides.
 */
@Component
@RequiredArgsConstructor
public class ShuttleLiveStore {

    // A phone that stops reporting for this long is treated as unknown, not frozen in place.
    private static final Duration STALE_AFTER = Duration.ofMinutes(2);
    private static final Duration BROADCAST_EVERY = Duration.ofSeconds(5);

    private final StringRedisTemplate redis;

    public record Position(double latitude, double longitude, Double heading, Instant at) {
    }

    public void save(String tripId, double latitude, double longitude, Double heading) {
        String key = key(tripId);
        redis.opsForHash().putAll(key, Map.of(
                "lat", String.valueOf(latitude),
                "lng", String.valueOf(longitude),
                "heading", heading == null ? "" : String.valueOf(heading),
                "at", Instant.now().toString()));
        redis.expire(key, STALE_AFTER);
    }

    public Optional<Position> find(String tripId) {
        Map<Object, Object> values = redis.opsForHash().entries(key(tripId));
        if (values.isEmpty()) {
            return Optional.empty();
        }
        String heading = (String) values.get("heading");
        return Optional.of(new Position(
                Double.parseDouble((String) values.get("lat")),
                Double.parseDouble((String) values.get("lng")),
                heading == null || heading.isEmpty() ? null : Double.valueOf(heading),
                Instant.parse((String) values.get("at"))));
    }

    /** True at most once per 5 s per trip, so position pings don't turn into a broadcast storm. */
    public boolean claimBroadcast(String tripId) {
        return Boolean.TRUE.equals(redis.opsForValue()
                .setIfAbsent("shuttle:broadcast:" + tripId, "1", BROADCAST_EVERY));
    }

    public void clear(String tripId) {
        redis.delete(key(tripId));
    }

    private static String key(String tripId) {
        return "shuttle:live:" + tripId;
    }
}

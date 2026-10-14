package com.ridex.location;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.stream.IntStream;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.connection.DefaultStringRedisConnection;
import org.springframework.data.redis.connection.RedisGeoCommands.GeoLocation;
import org.springframework.data.redis.connection.StringRedisConnection;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.domain.geo.GeoReference;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Where the on-duty drivers are, in Redis.
 *
 * <p>A position ping every few seconds from every on-duty driver is a write rate PostgreSQL should
 * never see, and its value expires in seconds. Losing Redis costs the last few pings and nothing
 * else - drivers re-register on their next one.
 *
 * <p>Two sorted sets, both keyed by driver id: drivers:online holds the pin (a geo set is a sorted
 * set of geohashes), drivers:seen the last ping in epoch millis. Geo sets have no per-member TTL,
 * so freshness lives beside the pin, and StaleLocationEvictionSweep removes what stopped pinging.
 * Every read costs a fixed number of round trips, however many drivers it returns.
 */
@Component
@RequiredArgsConstructor
public class DriverPresence {

    private static final String ONLINE_KEY = "drivers:online";
    private static final String SEEN_KEY = "drivers:seen";

    // A driver whose app died leaves a stale pin. Anything older than this is not really there.
    static final Duration STALE_AFTER = Duration.ofMinutes(2);

    // Fetched beyond the limit so a pin that went stale since the last sweep cannot shrink a wave.
    private static final int STALE_HEADROOM = 2;

    // Atomic, so a driver who pings mid-sweep is either kept or removed whole, never half. The
    // orphan pass catches pins with no freshness at all: a ping whose ZADD never landed.
    private static final DefaultRedisScript<Long> EVICT = new DefaultRedisScript<>("""
            local function remove(key, members)
              for i = 1, #members, 500 do
                redis.call('ZREM', key, unpack(members, i, math.min(i + 499, #members)))
              end
            end
            local stale = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', '(' .. ARGV[1])
            remove(KEYS[1], stale)
            remove(KEYS[2], stale)
            local orphans = redis.call('ZDIFF', 2, KEYS[1], KEYS[2])
            remove(KEYS[1], orphans)
            return #stale + #orphans
            """, Long.class);

    private final StringRedisTemplate redis;

    /** One round trip: the pin and its freshness are pipelined together. */
    public void report(String driverId, double latitude, double longitude) {
        long now = System.currentTimeMillis();
        pipelined(commands -> {
            commands.geoAdd(ONLINE_KEY, new Point(longitude, latitude), driverId);
            commands.zAdd(SEEN_KEY, now, driverId);
        });
    }

    public void goOffDuty(String driverId) {
        pipelined(commands -> {
            commands.zRem(ONLINE_KEY, driverId);
            commands.zRem(SEEN_KEY, driverId);
        });
    }

    /**
     * Driver ids within the radius, nearest first, stale pins dropped.
     *
     * <p>Two round trips whatever the count: GEOSEARCH for the candidates, then one ZMSCORE for
     * all their last pings. It used to be one EXISTS per candidate.
     */
    public List<String> nearby(double latitude, double longitude, double radiusMeters, int limit) {
        if (limit <= 0) {
            return List.of();
        }

        GeoResults<GeoLocation<String>> results = redis.opsForGeo().search(
                ONLINE_KEY,
                GeoReference.fromCoordinate(new Point(longitude, latitude)),
                new Distance(radiusMeters, RedisGeoCommands.DistanceUnit.METERS),
                RedisGeoCommands.GeoSearchCommandArgs.newGeoSearchArgs()
                        .sortAscending()
                        .limit((long) limit * STALE_HEADROOM));
        if (results == null) {
            return List.of();
        }

        List<String> candidates = results.getContent().stream()
                .map(result -> result.getContent().getName())
                .toList();
        List<Boolean> fresh = freshness(candidates);

        return IntStream.range(0, candidates.size())
                .filter(fresh::get)
                .mapToObj(candidates::get)
                .limit(limit)
                .toList();
    }

    /**
     * Where one driver last reported, or empty if they are off duty or their pings have gone stale.
     *
     * <p>Empty rather than a last-known pin: a marker that stopped moving ten minutes ago is worse
     * than no marker, because the rider keeps waiting at it.
     */
    public Optional<Position> positionOf(String driverId) {
        return positionsOf(List.of(driverId)).values().stream().findFirst();
    }

    /** The same for a set of drivers, in two round trips - the admin map asks for all of them. */
    public Map<String, Position> positionsOf(List<String> driverIds) {
        if (driverIds.isEmpty()) {
            return Map.of();
        }

        List<Point> points = redis.opsForGeo().position(ONLINE_KEY, driverIds.toArray(String[]::new));
        if (points == null) {
            return Map.of();
        }
        List<Boolean> fresh = freshness(driverIds);

        Map<String, Position> found = new LinkedHashMap<>();
        for (int i = 0; i < driverIds.size() && i < points.size(); i++) {
            // A pin without a fresh ping belongs to a phone that stopped reporting.
            if (points.get(i) instanceof Point point && fresh.get(i)) {
                found.put(driverIds.get(i), new Position(point.getY(), point.getX()));
            }
        }
        return found;
    }

    /** Removes every pin that stopped pinging, from both sets. Returns how many went. */
    public long evictStale() {
        long cutoff = System.currentTimeMillis() - STALE_AFTER.toMillis();
        Long evicted = redis.execute(EVICT, List.of(ONLINE_KEY, SEEN_KEY), Long.toString(cutoff));
        return evicted == null ? 0 : evicted;
    }

    // Sent together, answered together: one round trip for the lot.
    private void pipelined(Consumer<StringRedisConnection> commands) {
        redis.executePipelined((RedisCallback<Object>) connection -> {
            commands.accept(new DefaultStringRedisConnection(connection));
            return null;
        });
    }

    // One ZMSCORE for the lot, index-aligned with the ids. Missing or old is not fresh.
    private List<Boolean> freshness(List<String> driverIds) {
        if (driverIds.isEmpty()) {
            return List.of();
        }
        List<Double> lastSeen = redis.opsForZSet().score(SEEN_KEY, driverIds.toArray());
        double cutoff = System.currentTimeMillis() - STALE_AFTER.toMillis();
        return IntStream.range(0, driverIds.size())
                .mapToObj(i -> lastSeen != null && lastSeen.get(i) instanceof Double at && at >= cutoff)
                .toList();
    }

    /** Latitude first, the way every caller says it out loud. */
    public record Position(double latitude, double longitude) {

        private static final double EARTH_RADIUS_METERS = 6_371_000;

        /** Great-circle distance: close enough to tell a driver how far the pickup is. */
        public int metresTo(double lat, double lng) {
            double dLat = Math.toRadians(lat - latitude);
            double dLng = Math.toRadians(lng - longitude);
            double a = Math.pow(Math.sin(dLat / 2), 2)
                    + Math.cos(Math.toRadians(latitude)) * Math.cos(Math.toRadians(lat)) * Math.pow(Math.sin(dLng / 2), 2);
            return (int) Math.round(2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a)));
        }
    }
}

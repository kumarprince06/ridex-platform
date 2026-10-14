package com.ridex.maps;

import java.time.Duration;
import java.util.Locale;
import java.util.Optional;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.ridex.maps.domain.RouteEstimate;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.ObjectMapper;

/**
 * Recent route answers, so the same trip asked twice is billed once.
 *
 * <p>A rider who checks a fare, backs out and checks again asks the identical question within
 * seconds. Five minutes is short enough that the traffic duration is still honest.
 *
 * <p>Best effort in both directions: Redis down, or an entry written by an older RouteEstimate,
 * is a miss and a real provider call - never a failed fare estimate.
 */
@Slf4j
@Component
@RequiredArgsConstructor
class RouteCache {

    static final Duration TTL = Duration.ofMinutes(5);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    /**
     * Four decimal places, about 11 metres: a pin nudged across the same driveway is the same
     * route, and the cache should say so rather than pay for it again.
     */
    static String key(double pickupLat, double pickupLng, double destinationLat, double destinationLng) {
        return String.format(Locale.ROOT, "maps:route:%.4f,%.4f:%.4f,%.4f",
                pickupLat, pickupLng, destinationLat, destinationLng);
    }

    Optional<RouteEstimate> get(String key) {
        try {
            String cached = redis.opsForValue().get(key);
            return cached == null ? Optional.empty()
                    : Optional.of(objectMapper.readValue(cached, RouteEstimate.class));
        } catch (RuntimeException ex) {
            log.warn("Route cache read failed for {}, asking the provider: {}", key, ex.getMessage());
            return Optional.empty();
        }
    }

    void put(String key, RouteEstimate route) {
        try {
            redis.opsForValue().set(key, objectMapper.writeValueAsString(route), TTL);
        } catch (RuntimeException ex) {
            // The estimate is already answered; only the next identical one pays again.
            log.warn("Route cache write failed for {}: {}", key, ex.getMessage());
        }
    }
}

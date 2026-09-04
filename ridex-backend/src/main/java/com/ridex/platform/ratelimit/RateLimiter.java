package com.ridex.platform.ratelimit;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Fixed window: INCR the key, set its TTL on first hit. Less smooth than a token bucket, and
// entirely adequate for "8 failed logins per 15 minutes".
// ponytail: a burst can straddle two windows and get 2x the limit. Swap for a sliding window only
// if that margin ever matters.
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimiter {

    private final StringRedisTemplate redis;

    /** True when the caller is still within its allowance. */
    public boolean tryConsume(String key, int limit, Duration window) {
        try {
            Long count = redis.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redis.expire(key, window);
            }
            return count == null || count <= limit;
        } catch (RuntimeException ex) {
            // Fail open. A rate limiter that locks every user out when Redis blinks is a worse
            // outage than the abuse it prevents.
            log.warn("Rate limit check failed, allowing request: {}", ex.getMessage());
            return true;
        }
    }

    public void reset(String key) {
        try {
            redis.delete(key);
        } catch (RuntimeException ex) {
            log.warn("Rate limit reset failed: {}", ex.getMessage());
        }
    }
}

package com.ridex.platform.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

class RateLimiterTest {

    private static final Duration WINDOW = Duration.ofMinutes(15);

    private StringRedisTemplate redis;
    private ValueOperations<String, String> values;
    private RateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        rateLimiter = new RateLimiter(redis);
    }

    @Test
    void allowsUpToTheLimitAndThenBlocks() {
        when(values.increment("k")).thenReturn(8L, 9L);

        assertThat(rateLimiter.tryConsume("k", 8, WINDOW)).isTrue();
        assertThat(rateLimiter.tryConsume("k", 8, WINDOW)).isFalse();
    }

    @Test
    void setsTheWindowOnTheFirstHitOnly() {
        when(values.increment("k")).thenReturn(1L, 2L, 3L);

        rateLimiter.tryConsume("k", 8, WINDOW);
        rateLimiter.tryConsume("k", 8, WINDOW);
        rateLimiter.tryConsume("k", 8, WINDOW);

        // Re-setting the TTL on every hit would slide the window forward and never expire under
        // sustained load, which is exactly when the limit has to bite.
        verify(redis, times(1)).expire("k", WINDOW);
    }

    @Test
    void failsOpenWhenRedisIsUnavailable() {
        when(values.increment("k")).thenThrow(new RuntimeException("connection refused"));

        // Locking every user out when Redis blinks is a worse outage than the abuse it prevents.
        assertThat(rateLimiter.tryConsume("k", 8, WINDOW)).isTrue();
    }
}

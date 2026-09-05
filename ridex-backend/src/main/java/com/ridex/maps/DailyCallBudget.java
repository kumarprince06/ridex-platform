package com.ridex.maps;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * A daily cap on calls to a paid provider, counted here because the provider will not count it.
 *
 * <p>Google removed the adjustable daily quota from Maps APIs - the console shows "Unlimited,
 * Adjustable: No" - so there is no way to tell them to stop at a number. The only place left to
 * enforce a ceiling is the side making the calls.
 *
 * <p>Exhausting the budget is not an error the caller sees: {@link MapsService} treats it as the
 * provider being unavailable and falls through to the free one, so the app keeps working and the
 * bill stops growing.
 *
 * <p>ponytail: a Redis counter, not a rate-limiter library. INCR is atomic across nodes, the key
 * expires itself at midnight, and there is nothing to tune.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DailyCallBudget {

    private static final String KEY = "maps:calls:%s:%s";

    private final StringRedisTemplate redis;

    /**
     * Counts one call and says whether it was within budget.
     *
     * <p>Counted before the call, not after: counting successes would let a provider that fails
     * every time be retried forever, which is the run that actually costs money.
     *
     * @param limit calls allowed today. Zero or less means unlimited - a budget nobody set is not
     *              a budget of nothing.
     */
    public boolean tryConsume(String provider, int limit) {
        if (limit <= 0) {
            return true;
        }

        // UTC, matching how a provider counts a day. A local-midnight reset would give a few extra
        // hours on the wrong side of the boundary.
        String key = KEY.formatted(provider, LocalDate.now(ZoneOffset.UTC));

        Long used = redis.opsForValue().increment(key);
        if (used == null) {
            // Redis is down. Refusing every call because the counter is unavailable would take the
            // platform down with it, so the call goes through and the budget is best-effort.
            return true;
        }
        if (used == 1L) {
            // Set on first use rather than every call: the key is written once, and re-expiring it
            // on every increment would push midnight further away each time.
            redis.expire(key, Duration.ofDays(2));
        }

        if (used > limit) {
            log.warn("{} daily call budget of {} is spent ({} today) - falling back", provider,
                    limit, used);
            return false;
        }
        return true;
    }
}

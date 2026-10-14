package com.ridex.location;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Clears pins whose phones stopped pinging.
 *
 * <p>Reads already ignore them; this stops them taking GEOSEARCH slots from drivers who are really
 * there. Safe on every node at once - removing what is already gone does nothing.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StaleLocationEvictionSweep {

    private final DriverPresence driverPresence;

    @Value("${app.location.eviction-enabled:true}")
    private boolean enabled;

    @Scheduled(fixedDelayString = "${app.location.eviction-ms:30000}")
    public void evict() {
        if (!enabled) {
            return;
        }
        try {
            long evicted = driverPresence.evictStale();
            if (evicted > 0) {
                log.info("Evicted {} stale driver pins", evicted);
            }
        } catch (RuntimeException ex) {
            // Redis is down, so presence is unusable anyway. A warning, not a stack trace every 30s.
            log.warn("Stale pin eviction failed, retrying next run: {}", ex.getMessage());
        }
    }
}

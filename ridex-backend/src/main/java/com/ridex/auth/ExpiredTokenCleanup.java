package com.ridex.auth;

import java.time.Duration;
import java.time.Instant;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// refresh_tokens gains a row per device login and nothing else removes them.
@Slf4j
@Component
@RequiredArgsConstructor
public class ExpiredTokenCleanup {

    // Kept a week past expiry so a support question about a recent session can still be answered.
    private static final Duration GRACE = Duration.ofDays(7);

    private final RefreshTokenRepository refreshTokenRepository;

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void deleteExpiredRefreshTokens() {
        int deleted = refreshTokenRepository.deleteExpiredBefore(Instant.now().minus(GRACE));
        if (deleted > 0) {
            log.info("Deleted {} expired refresh tokens", deleted);
        }
    }
}

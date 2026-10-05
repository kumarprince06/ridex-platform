package com.ridex.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.BadCredentialsException;

import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.auth.dto.LoginRequest;
import com.ridex.auth.dto.RefreshTokenRequest;
import com.ridex.auth.dto.RefreshTokenResponse;
import com.ridex.auth.dto.RegisterRequest;
import com.ridex.shared.util.VerificationTokenGenerator;

// Real Postgres, not mocks: the race lives in row locking and commit order, which a mock cannot have.
@SpringBootTest
class RefreshRaceTest {

    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private RefreshTokenRepository refreshTokenRepository;

    @Test
    void twoParallelRefreshesOfOneTokenDoNotLogTheUserOut() throws Exception {
        String token = signedInRiderRefreshToken();

        CountDownLatch start = new CountDownLatch(1);
        List<CompletableFuture<RefreshTokenResponse>> calls = List.of(
                refreshAfter(start, token), refreshAfter(start, token));
        start.countDown();

        // A retried request or a second process both send the token they hold. Neither is theft.
        List<RefreshTokenResponse> results = calls.stream().map(CompletableFuture::join).toList();

        // The client keeps whichever answer it processed last, so both have to stay usable.
        for (RefreshTokenResponse result : results) {
            assertThat(authService.refresh(new RefreshTokenRequest(result.refreshToken())).accessToken())
                    .isNotBlank();
        }
    }

    @Test
    void replayingASpentTokenAfterTheGraceWindowStillEndsEverySession() {
        String spent = signedInRiderRefreshToken();
        String current = authService.refresh(new RefreshTokenRequest(spent)).refreshToken();
        rotatedLongAgo(current);

        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequest(spent)))
                .isInstanceOf(BadCredentialsException.class);

        // Two parties held that secret well apart in time; the owner cannot be told from the thief.
        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequest(current)))
                .isInstanceOf(BadCredentialsException.class);
    }

    private CompletableFuture<RefreshTokenResponse> refreshAfter(CountDownLatch start, String token) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                start.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(e);
            }
            return authService.refresh(new RefreshTokenRequest(token));
        });
    }

    // Moves the rotation outside the grace window without the test having to sleep through it.
    private void rotatedLongAgo(String currentToken) {
        var session = refreshTokenRepository.findByTokenHash(VerificationTokenGenerator.hash(currentToken))
                .orElseThrow();
        session.setLastUsedAt(Instant.now().minusSeconds(60));
        refreshTokenRepository.save(session);
    }

    private String signedInRiderRefreshToken() {
        String email = "race-" + System.nanoTime() + "@example.com";
        authService.register(new RegisterRequest(email, "Original@2026", UserRole.RIDER));

        var user = userRepository.findByEmail(email).orElseThrow();
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        return authService.login(new LoginRequest(email, "Original@2026", AppContext.RIDER),
                "test-agent", "127.0.0.1").refreshToken();
    }
}

package com.ridex.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.dto.ChangePasswordRequest;
import com.ridex.auth.dto.LoginRequest;
import com.ridex.auth.dto.RegisterRequest;
import com.ridex.shared.exception.ValidationException;

// Not @Transactional: auth events are written in their own transaction, so a user this test never
// committed does not exist by the time one is recorded against them.
@SpringBootTest
class AccountSecurityTest {

    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void theCurrentPasswordIsRequiredEvenWhenAlreadySignedIn() {
        String userId = signedInRider();

        // A phone left unlocked on a table is the threat: a token alone must not be enough to
        // lock the owner out of their own account.
        assertThatThrownBy(() -> authService.changePassword(userId,
                new ChangePasswordRequest("not-the-password", "brand-new-password")))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void changingThePasswordEndsEveryOtherSession() {
        String userId = signedInRider();
        long liveBefore = refreshTokenRepository.findAll().stream()
                .filter(token -> token.getUser().getId().equals(userId))
                .filter(token -> token.getRevokedAt() == null)
                .count();
        assertThat(liveBefore).isPositive();

        authService.changePassword(userId,
                new ChangePasswordRequest("Original@2026", "Replacement@2026"));

        // Somebody changes a password because they think another device has it. Leaving those
        // sessions alive makes the change theatre.
        assertThat(refreshTokenRepository.findAll().stream()
                .filter(token -> token.getUser().getId().equals(userId))
                .filter(token -> token.getRevokedAt() == null)
                .count()).isZero();

        assertThat(passwordEncoder.matches("Replacement@2026",
                userRepository.findById(userId).orElseThrow().getPasswordHash())).isTrue();
    }

    @Test
    void theHistoryShowsWhatHappenedOnTheAccount() {
        String userId = signedInRider();

        assertThat(authService.loginHistory(userId))
                .isNotEmpty()
                .anySatisfy(event -> assertThat(event.eventType()).isEqualTo("LOGIN_SUCCEEDED"));
    }

    private String signedInRider() {
        String email = "security-" + System.nanoTime() + "@example.com";
        authService.register(new RegisterRequest(email, "Original@2026", UserRole.RIDER));

        var user = userRepository.findByEmail(email).orElseThrow();
        user.setStatus(com.ridex.auth.domain.UserStatus.ACTIVE);
        userRepository.save(user);

        authService.login(new LoginRequest(email, "Original@2026", AppContext.RIDER), "test-agent", "127.0.0.1");
        return user.getId();
    }
}

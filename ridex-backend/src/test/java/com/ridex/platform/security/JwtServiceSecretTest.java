package com.ridex.platform.security;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

// A weak secret must stop the application booting, not degrade it quietly.
class JwtServiceSecretTest {

    private static final String GOOD_SECRET = "a-real-signing-key-of-at-least-32-bytes";

    @Test
    void rejectsTheRepositoryPlaceholder() {
        assertThatThrownBy(() -> new JwtService("change-me-please-very-long-secret-key", 900000, 604800000))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("placeholder");
    }

    @Test
    void rejectsASecretShorterThanTheHmacBlockSize() {
        assertThatThrownBy(() -> new JwtService("too-short", 900000, 604800000))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 bytes");
    }

    @Test
    void rejectsAMissingSecret() {
        assertThatThrownBy(() -> new JwtService("  ", 900000, 604800000))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not set");
    }

    @Test
    void acceptsAStrongSecret() {
        assertThatCode(() -> new JwtService(GOOD_SECRET, 900000, 604800000)).doesNotThrowAnyException();
    }
}

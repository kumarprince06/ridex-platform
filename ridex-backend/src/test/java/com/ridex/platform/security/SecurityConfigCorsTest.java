package com.ridex.platform.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;

class SecurityConfigCorsTest {

    private CorsConfiguration configFor(String path, String... origins) {
        SecurityConfig securityConfig = new SecurityConfig();
        ReflectionTestUtils.setField(securityConfig, "allowedOrigins", List.of(origins));

        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", path);
        return securityConfig.corsConfigurationSource().getCorsConfiguration(request);
    }

    @Test
    void allowsOnlyTheConfiguredOrigins() {
        CorsConfiguration config = configFor("/api/v1/auth/login", "https://console.ridex.test");

        assertThat(config.checkOrigin("https://console.ridex.test")).isNotNull();
        assertThat(config.checkOrigin("https://attacker.example")).isNull();
    }

    @Test
    void neverAllowsCredentials() {
        // The token is an Authorization header, so credentials would only widen the surface.
        assertThat(configFor("/api/v1/auth/login", "https://console.ridex.test").getAllowCredentials())
                .isNotEqualTo(Boolean.TRUE);
    }

    @Test
    void appliesToTheApiOnly() {
        assertThat(configFor("/actuator/health", "https://console.ridex.test")).isNull();
    }
}

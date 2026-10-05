package com.ridex.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.ridex.IntegrationTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.jayway.jsonpath.JsonPath;
import com.ridex.notification.OutboxRepository;
import com.ridex.shared.util.VerificationTokenGenerator;

// The whole account lifecycle through the real filter chain, controllers and Postgres - the path a
// client actually takes, where the service tests stop at the method boundary.
@IntegrationTest
class AuthLifecycleHttpTest {

    private static final String PASSWORD = "Original@2026";

    @Autowired private WebApplicationContext context;
    @Autowired private OutboxRepository outboxRepository;
    @Autowired private RefreshTokenRepository refreshTokenRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    void registerVerifyLoginRefreshReplayAndLogout() throws Exception {
        String email = "lifecycle-" + System.nanoTime() + "@example.com";

        call(post("/api/v1/auth/register"), """
                {"email":"%s","password":"%s","role":"RIDER"}""".formatted(email, PASSWORD),
                status().isAccepted());

        // Unverified accounts cannot sign in; the code is read from the outbox the mailer drains.
        call(post("/api/v1/auth/login"), loginBody(email), status().isForbidden());
        call(post("/api/v1/auth/verify"), """
                {"email":"%s","code":"%s"}""".formatted(email, verificationCode(email)),
                status().isNoContent());

        String spent = JsonPath.read(call(post("/api/v1/auth/login"), loginBody(email), status().isOk()),
                "$.refreshToken");
        String current = JsonPath.read(call(post("/api/v1/auth/refresh"), refreshBody(spent), status().isOk()),
                "$.refreshToken");

        // Past the grace window, a replay of the spent secret means two holders: every session ends.
        rotatedLongAgo(current);
        call(post("/api/v1/auth/refresh"), refreshBody(spent), status().isUnauthorized());
        call(post("/api/v1/auth/refresh"), refreshBody(current), status().isUnauthorized());

        // Signing in again works, and logging out kills exactly that session.
        String login = call(post("/api/v1/auth/login"), loginBody(email), status().isOk());
        String accessToken = JsonPath.read(login, "$.accessToken");
        String session = JsonPath.read(login, "$.refreshToken");

        call(post("/api/v1/auth/logout").header("Authorization", "Bearer " + accessToken),
                refreshBody(session), status().isNoContent());
        call(post("/api/v1/auth/refresh"), refreshBody(session), status().isUnauthorized());
    }

    private String call(MockHttpServletRequestBuilder request, String body, ResultMatcher expected)
            throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(expected)
                .andReturn().getResponse().getContentAsString();
    }

    private String verificationCode(String email) {
        return outboxRepository.findAll().stream()
                .filter(message -> email.equals(message.getRecipient()))
                .filter(message -> "VERIFY_ACCOUNT".equals(message.getEventType()))
                .findFirst().orElseThrow()
                .getPayload();
    }

    // Moves the rotation outside the grace window without the test having to sleep through it.
    private void rotatedLongAgo(String currentToken) {
        var row = refreshTokenRepository.findByTokenHash(VerificationTokenGenerator.hash(currentToken))
                .orElseThrow();
        row.setLastUsedAt(Instant.now().minusSeconds(60));
        refreshTokenRepository.save(row);
    }

    private static String loginBody(String email) {
        return """
                {"email":"%s","password":"%s","app":"RIDER"}""".formatted(email, PASSWORD);
    }

    private static String refreshBody(String token) {
        return """
                {"refreshToken":"%s"}""".formatted(token);
    }
}

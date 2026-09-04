package com.ridex.platform.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

// The Phase 0 exit gate: default-deny has to be demonstrated, not assumed. A misplaced permitAll
// once left every payment endpoint publicly callable, and nothing failed.
@SpringBootTest
class ProtectedRouteTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    void protectedRoutesRejectAnUnauthenticatedCall() throws Exception {
        mockMvc.perform(get("/api/v1/auth/sessions")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/maps/geocode").param("query", "x"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutIsNotPublicEvenThoughTheOtherAuthRoutesAre() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"anything\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aGarbageBearerTokenIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/auth/sessions").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void publicAuthRoutesStayReachable() throws Exception {
        // Not 401: a validation failure proves the route was reached, which is the point.
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}

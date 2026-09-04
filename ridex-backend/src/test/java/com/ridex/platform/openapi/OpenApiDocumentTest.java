package com.ridex.platform.openapi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

// A generated contract that silently stops generating is worse than none: the clients keep
// building against the last good copy.
@SpringBootTest
class OpenApiDocumentTest {

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
    void everyControllerAppearsInTheDocument() throws Exception {
        String document = fetchDocument();

        assertThat(document)
                .contains("/api/v1/auth/login")
                .contains("/api/v1/auth/verify")
                .contains("/api/v1/auth/sessions")
                .contains("/api/v1/rider/profile")
                .contains("/api/v1/driver/profile")
                .contains("/api/v1/maps/route");
    }

    @Test
    void theDocumentDeclaresTheBearerScheme() throws Exception {
        assertThat(fetchDocument()).contains("bearerAuth").contains("JWT");
    }

    private String fetchDocument() throws Exception {
        return mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }
}

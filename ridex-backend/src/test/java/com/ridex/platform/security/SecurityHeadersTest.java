package com.ridex.platform.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
class SecurityHeadersTest {

    @Autowired
    private WebApplicationContext context;

    @Test
    void everyResponseCarriesTheHardeningHeaders() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(
                org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers
                        .springSecurity()).build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .secure(true)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andReturn();

        // preload, CSP and Referrer-Policy are ours; nosniff and frame-options Spring sends anyway.
        assertThat(result.getResponse().getHeader("Strict-Transport-Security"))
                .contains("max-age=31536000").contains("includeSubDomains").contains("preload");
        assertThat(result.getResponse().getHeader("Content-Security-Policy"))
                .isEqualTo("default-src 'none'");
        assertThat(result.getResponse().getHeader("X-Frame-Options")).isEqualTo("DENY");
        assertThat(result.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(result.getResponse().getHeader("Referrer-Policy")).isEqualTo("no-referrer");
    }
}

package com.ridex.platform.openapi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.jayway.jsonpath.JsonPath;
import com.ridex.IntegrationTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

// A generated contract that silently stops generating is worse than none: the clients keep
// building against the last good copy.
@IntegrationTest
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

    @Test
    void swaggerUiLoadsWithoutAToken() throws Exception {
        // Reviewers arrive with no account: the page has to open before Authorize can be pressed.
        mockMvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
        // And its group dropdown lists the features, "all" first as the default view.
        assertThat(fetchDocument("/v3/api-docs/swagger-config"))
                .contains("\"name\":\"all\"").contains("\"name\":\"dispatch\"");
    }

    @Test
    void aGroupCarriesItsOwnFeatureOnly() throws Exception {
        // /api/v1/driver is shared by three features; grouping by package keeps them apart.
        assertThat(fetchDocument("/v3/api-docs/dispatch"))
                .contains("/api/v1/driver/offers")
                .doesNotContain("/api/v1/driver/wallet")
                .doesNotContain("/api/v1/driver/profile");
    }

    @Test
    void theWalkthroughEndpointsSaySoInOneLine() throws Exception {
        assertThat(fetchDocument("/v3/api-docs/trips"))
                .contains("Start the trip with the rider's pickup code");
    }

    @Test
    void everyOperationHasASummary() throws Exception {
        // Swagger UI shows the summary beside each route; without one a reviewer reads method names.
        List<Map<String, Object>> operations = JsonPath.read(fetchDocument(), "$.paths.*.*");

        assertThat(operations).hasSizeGreaterThan(100);
        assertThat(operations.stream().filter(op -> !op.containsKey("summary"))
                .map(op -> op.get("operationId"))).isEmpty();
    }

    private String fetchDocument() throws Exception {
        return fetchDocument("/v3/api-docs");
    }

    private String fetchDocument(String path) throws Exception {
        return mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }
}

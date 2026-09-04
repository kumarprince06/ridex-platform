package com.ridex.platform.openapi;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

// The generated document is the API contract; docs/10 is prose that will drift from it. The three
// clients should generate their types from /v3/api-docs rather than hand-writing them.
@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI ridexOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("RideX Platform API")
                        .version("v1")
                        .description("""
                                Rider, driver and operations API.

                                Every route requires a bearer access token except registration,
                                login, refresh, verification and password reset. A login states
                                which surface it came from, and the token is granted only that
                                surface's roles."""))
                // Declared once, applied to everything: the exceptions are the public routes, and
                // listing those is shorter than annotating every protected endpoint.
                .addSecurityItem(new SecurityRequirement().addList(BEARER))
                .components(new Components().addSecuritySchemes(BEARER, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}

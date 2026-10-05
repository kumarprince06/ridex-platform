package com.ridex.platform.openapi;

import java.util.Arrays;

import org.springdoc.core.models.GroupedOpenApi;
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

    // Swagger UI's group dropdown. "all" first: it is the default view, and /v3/api-docs is what
    // the clients generate their types from, so it must keep carrying every route.
    @Bean
    public GroupedOpenApi allGroup() {
        return GroupedOpenApi.builder().group("all").pathsToMatch("/api/**").build();
    }

    // By package, not by path: packages are the feature boundaries (ADR-009), whereas /api/v1/driver
    // is shared by dispatch, driver profile and wallet.
    @Bean
    public GroupedOpenApi authGroup() {
        return group("auth", "auth");
    }

    @Bean
    public GroupedOpenApi ridesGroup() {
        return group("rides", "ride", "pricing");
    }

    @Bean
    public GroupedOpenApi dispatchGroup() {
        return group("dispatch", "dispatch");
    }

    @Bean
    public GroupedOpenApi tripsGroup() {
        return group("trips", "trip");
    }

    @Bean
    public GroupedOpenApi paymentsGroup() {
        return group("payments", "payment", "wallet");
    }

    @Bean
    public GroupedOpenApi shuttleGroup() {
        return group("shuttle", "shuttle");
    }

    @Bean
    public GroupedOpenApi accountsGroup() {
        return group("accounts", "rider", "driver", "vehicle", "places", "points", "notification");
    }

    @Bean
    public GroupedOpenApi supportGroup() {
        return group("support", "support", "legal", "maps");
    }

    @Bean
    public GroupedOpenApi adminGroup() {
        return group("admin", "admin");
    }

    private static GroupedOpenApi group(String name, String... features) {
        String[] packages = Arrays.stream(features).map(feature -> "com.ridex." + feature)
                .toArray(String[]::new);
        return GroupedOpenApi.builder().group(name).packagesToScan(packages).build();
    }
}

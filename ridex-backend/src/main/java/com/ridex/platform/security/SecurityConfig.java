package com.ridex.platform.security;

import com.ridex.platform.ratelimit.RateLimitFilter;
import com.ridex.platform.ratelimit.RateLimiter;

import jakarta.servlet.DispatcherType;

import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
// Without this, an @PreAuthorize added later is silently ignored rather than enforced.
@EnableMethodSecurity
public class SecurityConfig {

    /**
     * Endpoints reachable without a token. Everything not on this list requires authentication -
     * the previous config opened all of /api/v1/tenants/**, which left payments and settlements
     * publicly callable.
     *
     * <p>Logout is deliberately absent: revoking a session requires proving you own it.
     */
    private static final String[] PUBLIC_ENDPOINTS = {
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
        "/api/v1/auth/verify",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/reset-password",
        // A gateway carries no bearer token. Its signature is the authentication, checked in the
        // controller before the body is parsed.
        "/api/v1/payments/webhook"
    };

    /**
     * Browser origins allowed to call the API. The mobile apps are not browsers and are unaffected;
     * this exists for the console, which cannot reach the API at all without it.
     */
    @Value("${app.cors.allowed-origins:http://localhost:5174}")
    private List<String> allowedOrigins;

    @Value("${app.rate-limit.ip-requests:30}")
    private int ipRequestLimit;

    @Value("${app.rate-limit.ip-window:1m}")
    private Duration ipWindow;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter, RateLimiter rateLimiter) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            // Ahead of authentication: an unauthenticated flood must be turned away before it
            // costs a BCrypt comparison each.
            .addFilterBefore(new RateLimitFilter(rateLimiter, ipRequestLimit, ipWindow),
                    UsernamePasswordAuthenticationFilter.class)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                // A year of HSTS with preload: after the first visit the browser refuses plain
                // HTTP, which closes the downgrade window a redirect leaves open.
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .preload(true)
                    .maxAgeInSeconds(31536000))
                // This API returns JSON only, so there is nothing to frame and nothing to sniff.
                .frameOptions(frame -> frame.deny())
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'"))
                .referrerPolicy(referrer -> referrer.policy(
                    org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter
                        .ReferrerPolicy.NO_REFERRER)))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new ProblemAuthenticationEntryPoint()))
            .authorizeHttpRequests(auth -> auth
                .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                .requestMatchers("/actuator/health").permitAll()
                // The schema of the API, not the data in it. ponytail: fine while the API is
                // public-facing anyway; put it behind auth if the endpoint list ever becomes
                // something worth hiding.
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .anyRequest().authenticated());

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Listed origins only. setAllowedOrigins rather than the pattern variant, so a wildcard
        // cannot be configured by accident.
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
        // The token travels in the Authorization header, not a cookie, so the browser never needs
        // to send credentials - and leaving this off keeps the wildcard-with-credentials hole shut.
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

}

package com.ridex.infrastructure.config;

import com.ridex.infrastructure.security.JwtAuthenticationFilter;
import jakarta.servlet.DispatcherType;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter)
            throws Exception {
        http
            // No cookie-based session means no ambient credential for a forged cross-site request
            // to ride on, which is the only thing CSRF tokens defend against.
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                // Spring Security 6 filters FORWARD and ERROR dispatches too, so a 404 on a
                // permitted path would be re-checked as GET /error and answered 403 instead.
                .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                // Matched top to bottom, first match wins, so the open paths come before anyRequest.
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/tenants/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated());

        return http.build();
    }

}

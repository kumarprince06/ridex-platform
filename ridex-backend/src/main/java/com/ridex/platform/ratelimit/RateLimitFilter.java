package com.ridex.platform.ratelimit;

import java.io.IOException;
import java.time.Duration;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

// Per-IP ceiling on the unauthenticated surface. Deliberately not a @Component: Boot would then
// also register it as a plain servlet filter and every request would be counted twice.
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    // Only the auth calls a password or code can be guessed through. Refresh, sessions and logout
    // need a token already, and counting them signed staff out for reloading pages quickly.
    // Estimates are here because each one costs a billed maps call.
    private static final String[] LIMITED_PREFIXES = {
            "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/verify",
            "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password",
            "/api/v1/auth/change-password", "/api/v1/maps/", "/api/v1/rides/estimate"};

    private final RateLimiter rateLimiter;
    private final int limit;
    private final Duration window;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String key = "rl:ip:" + clientIp(request) + ":" + request.getRequestURI();
        if (!rateLimiter.tryConsume(key, limit, window)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(window.toSeconds()));
            response.setContentType("application/problem+json");
            response.getWriter().write(
                    "{\"status\":429,\"title\":\"Too Many Requests\","
                    + "\"detail\":\"Too many requests. Try again shortly.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        for (String prefix : LIMITED_PREFIXES) {
            if (path.startsWith(prefix)) {
                return false;
            }
        }
        return true;
    }

    // ponytail: trusts the first X-Forwarded-For hop, same as AuthController. Correct only behind a
    // proxy that overwrites the header, or a client sets it and gets a fresh bucket per request.
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded == null || forwarded.isBlank()) {
            return request.getRemoteAddr();
        }
        return forwarded.split(",")[0].trim();
    }
}

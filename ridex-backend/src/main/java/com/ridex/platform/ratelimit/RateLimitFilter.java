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

    private static final String[] LIMITED_PREFIXES = {"/api/v1/auth/", "/api/v1/maps/"};

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

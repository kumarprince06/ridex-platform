package com.ridex.platform.security;

import java.io.IOException;

import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * Authenticates from the token alone. The tenant-membership lookup this filter used to perform is
 * gone with the tenant model, which also removes a database round trip from every request.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
                // No credentials presented. Authorization decides whether that is allowed.
                filterChain.doFilter(request, response);
                return;
            }

            String token = authorizationHeader.substring(7).trim();
            if (token.isEmpty()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing JWT token.");
                return;
            }

            Authentication authentication = jwtService.accessPrincipal(token).toAuthentication();
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (Exception ex) {
            // Only token problems land here. The chain call is deliberately outside this block:
            // with it inside, any unhandled exception from any controller came back as
            // "Invalid or expired JWT token" with a 401, and a 500 masquerading as an auth
            // failure sends everyone looking in the wrong place.
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired JWT token.");
            return;
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Stateless: nothing may leak to the next request on this thread.
            SecurityContextHolder.clearContext();
        }
    }

    /**
     * Fails closed: an unrecognised role name aborts the request rather than being skipped, so a
     * token minted by an older or tampered-with issuer cannot quietly authenticate with fewer
     * authorities than it claims.
     */
}

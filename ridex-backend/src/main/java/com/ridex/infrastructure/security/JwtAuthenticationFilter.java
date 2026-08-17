package com.ridex.infrastructure.security;

import java.io.IOException;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.ridex.domain.user.AppContext;
import com.ridex.domain.user.UserRole;

import io.jsonwebtoken.Claims;
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

            Claims claims = jwtService.parseClaims(token);

            // A refresh token is long-lived and only ever meant for /auth/refresh. Without this
            // check it would be accepted here as a week-long access token.
            if (!JwtService.TOKEN_TYPE_ACCESS.equals(claims.get(JwtService.CLAIM_TOKEN_TYPE, String.class))) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Not an access token.");
                return;
            }

            String userId = claims.getSubject();
            String email = claims.get(JwtService.CLAIM_EMAIL, String.class);
            String app = claims.get(JwtService.CLAIM_APP, String.class);
            Set<UserRole> roles = readRoles(claims);

            if (userId == null || email == null || app == null || roles.isEmpty()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "JWT claims are incomplete.");
                return;
            }

            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    new JwtPrincipal(userId, email, roles, AppContext.valueOf(app)),
                    null,
                    roles.stream()
                            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.name()))
                            .toList());
            SecurityContextHolder.getContext().setAuthentication(authentication);

            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired JWT token.");
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    /**
     * Fails closed: an unrecognised role name aborts the request rather than being skipped, so a
     * token minted by an older or tampered-with issuer cannot quietly authenticate with fewer
     * authorities than it claims.
     */
    private Set<UserRole> readRoles(Claims claims) {
        Object raw = claims.get(JwtService.CLAIM_ROLES);
        if (!(raw instanceof List<?> values)) {
            return Set.of();
        }

        Set<UserRole> roles = EnumSet.noneOf(UserRole.class);
        for (Object value : values) {
            roles.add(UserRole.valueOf(String.valueOf(value)));
        }
        return roles;
    }
}

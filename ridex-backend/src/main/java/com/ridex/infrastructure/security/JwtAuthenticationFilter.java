package com.ridex.infrastructure.security;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.ridex.domain.tenant.TenantContext;
import com.ridex.domain.tenant.TenantUserRole;
import com.ridex.domain.tenant.TenantUserStatus;
import com.ridex.infrastructure.persistence.jpa.repository.TenantUserRepository;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final TenantUserRepository tenantUserRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
                filterChain.doFilter(request, response);
                return;
            }

            String token = authorizationHeader.substring(7).trim();
            if (token.isEmpty()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing JWT token.");
                return;
            }

            Claims claims = jwtService.parseClaims(token);
            String userId = claims.get("sub", String.class);
            String email = claims.get("email", String.class);
            String tenantId = claims.get("tenantId", String.class);
            String role = claims.get("role", String.class);

            if (userId == null || email == null || tenantId == null || role == null) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "JWT claims are incomplete.");
                return;
            }

            if (TenantUserRole.SUPER_ADMIN.name().equals(role)) {
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                        new JwtPrincipal(userId, email, tenantId, role),
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                TenantContextHolder.set(TenantContext.of(userId, tenantId, role));
                filterChain.doFilter(request, response);
                return;
            }

            tenantUserRepository.findByTenantIdAndUserId(tenantId, userId)
                    .ifPresentOrElse(membership -> {
                        if (membership.getStatus() != TenantUserStatus.ACTIVE) {
                            throw new IllegalStateException("Inactive tenant membership");
                        }

                        Authentication authentication = new UsernamePasswordAuthenticationToken(
                                new JwtPrincipal(userId, email, tenantId, role),
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        TenantContextHolder.set(TenantContext.of(userId, tenantId, role));
                    }, () -> {
                        throw new IllegalStateException("User is not a member of the tenant in the JWT.");
                    });

            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            TenantContextHolder.clear();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired JWT token.");
        } finally {
            TenantContextHolder.clear();
            SecurityContextHolder.clearContext();
        }
    }
}

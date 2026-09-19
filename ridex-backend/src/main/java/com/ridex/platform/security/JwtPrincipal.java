package com.ridex.platform.security;

import java.util.Set;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticatedPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.UserRole;

public record JwtPrincipal(
        String userId,
        String email,
        Set<UserRole> roles,
        AppContext app) implements AuthenticatedPrincipal {

    // The user id, so a WebSocket session is known by the same id as every other request.
    @Override
    public String getName() {
        return userId;
    }

    public Authentication toAuthentication() {
        return new UsernamePasswordAuthenticationToken(this, null,
                roles.stream().map(role -> new SimpleGrantedAuthority("ROLE_" + role.name())).toList());
    }
}

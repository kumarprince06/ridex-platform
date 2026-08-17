package com.ridex.infrastructure.security;

import java.util.Set;

import com.ridex.domain.user.AppContext;
import com.ridex.domain.user.UserRole;

public record JwtPrincipal(
        String userId,
        String email,
        Set<UserRole> roles,
        AppContext app) {
}

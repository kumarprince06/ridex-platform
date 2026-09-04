package com.ridex.platform.security;

import java.util.Set;

import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.UserRole;

public record JwtPrincipal(
        String userId,
        String email,
        Set<UserRole> roles,
        AppContext app) {
}

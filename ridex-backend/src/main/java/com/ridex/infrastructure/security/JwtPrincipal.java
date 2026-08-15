package com.ridex.infrastructure.security;

public record JwtPrincipal(
        String userId,
        String email,
        String tenantId,
        String role) {
}

package com.ridex.api.dto.auth;

public record RefreshTokenResponse(
        String token,
        String tokenType,
        String userId,
        String email,
        String role,
        String tenantId,
        String refreshToken) {
}

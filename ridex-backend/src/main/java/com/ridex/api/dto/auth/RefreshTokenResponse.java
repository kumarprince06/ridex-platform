package com.ridex.api.dto.auth;

import java.util.Set;

import com.ridex.domain.user.AppContext;
import com.ridex.domain.user.UserRole;

public record RefreshTokenResponse(
        String token,
        String tokenType,
        String userId,
        String email,
        Set<UserRole> roles,
        AppContext app,
        String refreshToken) {
}

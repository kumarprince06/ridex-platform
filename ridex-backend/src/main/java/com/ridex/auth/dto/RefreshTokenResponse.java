package com.ridex.auth.dto;

import java.util.Set;

import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.UserRole;

public record RefreshTokenResponse(
        String accessToken,
        String tokenType,
        String userId,
        String email,
        Set<UserRole> roles,
        AppContext app,
        String refreshToken) {
}

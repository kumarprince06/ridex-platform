package com.ridex.auth.dto;

import java.util.Set;

import com.ridex.auth.domain.AppContext;
import com.ridex.auth.domain.UserRole;

public record LoginResponse(
        String accessToken,
        String tokenType,
        String userId,
        String email,
        /** Only the roles granted for this surface, not everything the account holds. */
        Set<UserRole> roles,
        AppContext app,
        String refreshToken) {
}

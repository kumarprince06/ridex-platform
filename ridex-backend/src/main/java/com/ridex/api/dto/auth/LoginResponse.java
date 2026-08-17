package com.ridex.api.dto.auth;

import java.util.Set;

import com.ridex.domain.user.AppContext;
import com.ridex.domain.user.UserRole;

public record LoginResponse(
        String token,
        String tokenType,
        String userId,
        String email,
        /** Only the roles granted for this surface, not everything the account holds. */
        Set<UserRole> roles,
        AppContext app,
        String refreshToken) {
}

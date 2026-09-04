package com.ridex.auth.domain;

import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Which surface a login came from. The rider app, the driver app and the ops panel are separate
 * clients, so the client states which one it is and the server checks the account actually holds a
 * role for it.
 *
 * <p>Two reasons this exists rather than issuing one token for every role the account holds:
 *
 * <ol>
 *   <li>A person who drives and also rides gets a clear "this account is not registered as a
 *       driver" at the login screen instead of an unexplained 403 several screens later.
 *   <li>Least privilege. The token is granted only the roles this surface needs, so a stolen
 *       rider-app token cannot reach driver endpoints.
 * </ol>
 *
 * <p>This is a usability and blast-radius control, not the security boundary. Endpoints still
 * authorize on role, so a forged {@code app} value grants nothing on its own.
 */
public enum AppContext {

    RIDER(EnumSet.of(UserRole.RIDER)),
    DRIVER(EnumSet.of(UserRole.DRIVER)),
    ADMIN(EnumSet.of(UserRole.SUPPORT, UserRole.OPS_ADMIN, UserRole.SUPER_ADMIN));

    private final Set<UserRole> permittedRoles;

    AppContext(Set<UserRole> permittedRoles) {
        this.permittedRoles = permittedRoles;
    }

    /** The caller's roles that this surface may act with. Empty means they cannot use it at all. */
    public Set<UserRole> grantableFrom(Set<UserRole> userRoles) {
        return userRoles.stream()
                .filter(permittedRoles::contains)
                .collect(Collectors.toUnmodifiableSet());
    }

    /** Wording for a rejected login. Deliberately says nothing about whether the account exists. */
    public String rejectionMessage() {
        return switch (this) {
            case RIDER -> "This account is not registered as a rider.";
            case DRIVER -> "This account is not registered as a driver.";
            case ADMIN -> "This account does not have administrative access.";
        };
    }
}

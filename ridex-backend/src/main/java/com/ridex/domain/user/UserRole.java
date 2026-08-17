package com.ridex.domain.user;

import java.util.EnumSet;
import java.util.Set;

/**
 * Roles as defined in docs/07-Roles-and-Permissions.md. One account may hold several: a driver who
 * also takes rides is one person with one login, not two accounts.
 *
 * <p>Fine-grained permissions (RIDER_SELF, DRIVER_TRIP, FINANCE, ...) are derived from these in
 * code rather than stored. A permissions table only earns its place once operations needs to edit
 * them without a deploy.
 */
public enum UserRole {

    RIDER,
    DRIVER,
    SUPPORT,
    OPS_ADMIN,
    SUPER_ADMIN;

    /**
     * The only roles a public signup may ask for. Staff roles are provisioned by an existing
     * admin - if this set ever includes one, anyone on the internet becomes staff.
     */
    private static final Set<UserRole> SELF_REGISTERABLE = EnumSet.of(RIDER, DRIVER);

    public boolean isSelfRegisterable() {
        return SELF_REGISTERABLE.contains(this);
    }
}

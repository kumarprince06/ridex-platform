package com.ridex.notification.dto;

import jakarta.validation.constraints.NotNull;

/**
 * All three at once.
 *
 * <p>Whole rather than partial on purpose: a settings screen shows three switches and sends what
 * they are now, and a partial update turns "I did not change that one" into "leave it alone" -
 * which is the same thing until two devices disagree.
 */
public record UpdatePreferencesRequest(
        @NotNull Boolean push,
        @NotNull Boolean email,
        @NotNull Boolean promotions) {
}

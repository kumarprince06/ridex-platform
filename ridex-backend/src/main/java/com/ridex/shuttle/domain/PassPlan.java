package com.ridex.shuttle.domain;

import java.util.Arrays;
import java.util.Optional;

/**
 * The four passes a route can sell. Fixed rather than free-form: riders compare them side by side,
 * and "save 15% on a quarter" only means something when every route counts a quarter the same way.
 */
public enum PassPlan {

    MONTHLY("Monthly pass", 1, 30),
    QUARTERLY("Quarterly pass", 3, 90),
    HALF_YEARLY("Half-yearly pass", 6, 180),
    YEARLY("Yearly pass", 12, 365);

    private final String label;
    private final int months;
    private final int days;

    PassPlan(String label, int months, int days) {
        this.label = label;
        this.months = months;
        this.days = days;
    }

    public String label() {
        return label;
    }

    public int months() {
        return months;
    }

    public int days() {
        return days;
    }

    public static Optional<PassPlan> ofDays(int days) {
        return Arrays.stream(values()).filter(plan -> plan.days == days).findFirst();
    }
}

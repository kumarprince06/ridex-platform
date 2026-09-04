package com.ridex.pricing.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import com.ridex.shared.money.Money;

/**
 * Turns a distance and a duration into a fare.
 *
 * <p>No Spring, no database, no clock: everything it needs is an argument, so the maths that
 * decides what people are charged can be tested exhaustively in milliseconds.
 */
public final class FareCalculator {

    private FareCalculator() {
    }

    /** An estimate: nobody has waited yet, so there is no waiting to charge for. */
    public static Fare calculate(FareRates rates, int distanceMeters, int durationSeconds) {
        return calculate(rates, distanceMeters, durationSeconds, 0);
    }

    public static Fare calculate(FareRates rates, int distanceMeters, int durationSeconds,
            int waitingSeconds) {
        if (distanceMeters < 0 || durationSeconds < 0 || waitingSeconds < 0) {
            throw new IllegalArgumentException("Distance, duration and waiting cannot be negative");
        }

        List<FareLine> lines = new ArrayList<>();

        Money base = rates.baseFare();
        lines.add(new FareLine(FareLineType.BASE, "Base fare", base, 1));

        // Scale once from the rate, rather than rounding a per-km figure and multiplying.
        BigDecimal kilometres = BigDecimal.valueOf(distanceMeters)
                .divide(BigDecimal.valueOf(1000), 4, RoundingMode.HALF_UP);
        Money distance = rates.perKilometre().times(kilometres);
        lines.add(new FareLine(FareLineType.DISTANCE, formatKm(kilometres), distance, 2));

        BigDecimal minutes = BigDecimal.valueOf(durationSeconds)
                .divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
        Money time = rates.perMinute().times(minutes);
        lines.add(new FareLine(FareLineType.TIME, formatMinutes(minutes), time, 3));

        Money subtotal = base.plus(distance).plus(time);

        // Only past the free allowance. A driver who arrives early must not start a meter on a
        // rider who is still on time.
        int chargeableWaiting = Math.max(0, waitingSeconds - rates.freeWaitingSeconds());
        if (chargeableWaiting > 0 && rates.perWaitingMinute().amountMinor() > 0) {
            BigDecimal waitingMinutes = BigDecimal.valueOf(chargeableWaiting)
                    .divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
            Money waiting = rates.perWaitingMinute().times(waitingMinutes);
            lines.add(new FareLine(
                    FareLineType.WAITING, formatMinutes(waitingMinutes) + " waiting", waiting, 4));
            subtotal = subtotal.plus(waiting);
        }

        // Surge is a line on top, never folded into the rates. A rider who cannot see the
        // multiplier cannot tell a surge from a price rise.
        BigDecimal surge = rates.surgeMultiplier();
        if (surge.compareTo(BigDecimal.ONE) > 0) {
            Money surged = subtotal.times(surge);
            Money uplift = surged.minus(subtotal);
            lines.add(new FareLine(FareLineType.SURGE,
                    "Busy area (" + surge.stripTrailingZeros().toPlainString() + "x)", uplift, 5));
            subtotal = surged;
        }

        // Shown as its own line, so a short trip does not look like the arithmetic is broken.
        if (subtotal.compareTo(rates.minimumFare()) < 0) {
            Money adjustment = rates.minimumFare().minus(subtotal);
            lines.add(new FareLine(
                    FareLineType.MINIMUM_FARE_ADJUSTMENT, "Minimum fare", adjustment, 6));
            subtotal = rates.minimumFare();
        }

        return new Fare(lines, subtotal);
    }

    private static String formatKm(BigDecimal kilometres) {
        return kilometres.setScale(1, RoundingMode.HALF_UP).toPlainString() + " km";
    }

    private static String formatMinutes(BigDecimal minutes) {
        return minutes.setScale(0, RoundingMode.HALF_UP).toPlainString() + " min";
    }
}

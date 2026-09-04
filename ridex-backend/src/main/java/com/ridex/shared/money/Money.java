package com.ridex.shared.money;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.Objects;

/**
 * An amount in minor units with an explicit currency. Never a double, never a bare number.
 *
 * <p>Minor units because 0.1 + 0.2 is not 0.3 in binary floating point, and a fare is added up
 * from a dozen lines. Explicit currency because the platform will run in more than one, and an
 * amount without one is a bug waiting for its second market.
 */
public record Money(long amountMinor, Currency currency) implements Comparable<Money> {

    public Money {
        Objects.requireNonNull(currency, "currency");
    }

    public static Money of(long amountMinor, Currency currency) {
        return new Money(amountMinor, currency);
    }

    public static Money zero(Currency currency) {
        return new Money(0, currency);
    }

    public Money plus(Money other) {
        requireSameCurrency(other);
        return new Money(Math.addExact(amountMinor, other.amountMinor), currency);
    }

    public Money minus(Money other) {
        requireSameCurrency(other);
        return new Money(Math.subtractExact(amountMinor, other.amountMinor), currency);
    }

    /**
     * Scales by a rate, rounding half-up once at the end.
     *
     * <p>Callers must not round each line themselves: rounding per line and then summing drifts
     * from rounding the total, by an amount the rider can see on a long receipt.
     */
    public Money times(BigDecimal factor) {
        BigDecimal scaled = BigDecimal.valueOf(amountMinor).multiply(factor);
        return new Money(scaled.setScale(0, RoundingMode.HALF_UP).longValueExact(), currency);
    }

    public Money max(Money other) {
        requireSameCurrency(other);
        return amountMinor >= other.amountMinor ? this : other;
    }

    public boolean isNegative() {
        return amountMinor < 0;
    }

    @Override
    public int compareTo(Money other) {
        requireSameCurrency(other);
        return Long.compare(amountMinor, other.amountMinor);
    }

    private void requireSameCurrency(Money other) {
        if (!currency.equals(other.currency)) {
            // Silently treating INR as USD would be a pricing bug nobody notices until settlement.
            throw new IllegalArgumentException(
                    "Cannot combine " + currency.getCurrencyCode() + " with " + other.currency.getCurrencyCode());
        }
    }
}

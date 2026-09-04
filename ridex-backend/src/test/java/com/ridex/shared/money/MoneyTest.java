package com.ridex.shared.money;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.Currency;

import org.junit.jupiter.api.Test;

class MoneyTest {

    private static final Currency INR = Currency.getInstance("INR");
    private static final Currency USD = Currency.getInstance("USD");

    @Test
    void addsWithoutFloatingPointDrift() {
        Money total = Money.zero(INR);
        // The classic double failure: 0.1 added ten times is not 1.0.
        for (int i = 0; i < 10; i++) {
            total = total.plus(Money.of(10, INR));
        }

        assertThat(total).isEqualTo(Money.of(100, INR));
    }

    @Test
    void refusesToMixCurrencies() {
        assertThatThrownBy(() -> Money.of(100, INR).plus(Money.of(100, USD)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("INR")
                .hasMessageContaining("USD");
    }

    @Test
    void roundsHalfUpOnce() {
        // 1005 * 1.5 = 1507.5, which must land on 1508 rather than truncating to 1507.
        assertThat(Money.of(1005, INR).times(new BigDecimal("1.5"))).isEqualTo(Money.of(1508, INR));
    }

    @Test
    void surgeAppliedToATotalDiffersFromSurgeAppliedPerLine() {
        // Why callers must not round per line: three lines rounded individually drift from the
        // total rounded once, and the rider can see the difference.
        BigDecimal surge = new BigDecimal("1.35");
        Money perLine = Money.of(333, INR).times(surge)
                .plus(Money.of(333, INR).times(surge))
                .plus(Money.of(333, INR).times(surge));
        Money onTotal = Money.of(999, INR).times(surge);

        assertThat(perLine).isNotEqualTo(onTotal);
    }

    @Test
    void overflowFailsLoudlyRatherThanWrappingNegative() {
        assertThatThrownBy(() -> Money.of(Long.MAX_VALUE, INR).plus(Money.of(1, INR)))
                .isInstanceOf(ArithmeticException.class);
    }
}

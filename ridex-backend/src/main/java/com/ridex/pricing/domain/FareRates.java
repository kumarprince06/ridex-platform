package com.ridex.pricing.domain;

import java.math.BigDecimal;
import java.util.Currency;

import com.ridex.shared.money.Money;

/** The rates in force for a ride type, as a value object the calculator can be handed. */
public record FareRates(
        Currency currency,
        Money baseFare,
        Money perKilometre,
        Money perMinute,
        Money minimumFare,
        int freeWaitingSeconds,
        Money perWaitingMinute,
        BigDecimal surgeMultiplier) {
}

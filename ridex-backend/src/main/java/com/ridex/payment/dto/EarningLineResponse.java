package com.ridex.payment.dto;

import java.math.BigDecimal;
import java.time.Instant;

/** One trip's earnings, as the driver can check them: gross, rate, commission, net. */
public record EarningLineResponse(
        String tripId,
        long grossAmountMinor,
        BigDecimal commissionRate,
        long commissionMinor,
        long netAmountMinor,
        Instant earnedAt) {
}

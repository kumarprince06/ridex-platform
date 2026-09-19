package com.ridex.wallet.dto;

import java.time.Instant;

/** One driver's wallet as operations sees it. Negative balance is money the driver owes. */
public record AdminWalletResponse(
        String driverId,
        String name,
        String email,
        String phone,
        long balanceMinor,
        boolean blocked,
        boolean onDuty,
        Instant lastTopUpAt) {
}

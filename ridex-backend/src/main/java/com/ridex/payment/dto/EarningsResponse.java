package com.ridex.payment.dto;

import java.util.List;

public record EarningsResponse(
        String currency,
        long lifetimeNetMinor,
        /** What the ledger says is owed right now, after cash already collected. */
        long ledgerBalanceMinor,
        List<EarningLineResponse> recent) {
}

package com.ridex.wallet.dto;

import java.time.Instant;

/** A line on a driver's wallet: what moved, which way, and what it was for. */
public record WalletEntryResponse(
        String entryType,
        String direction,
        long amountMinor,
        String referenceType,
        String referenceId,
        Instant createdAt) {
}

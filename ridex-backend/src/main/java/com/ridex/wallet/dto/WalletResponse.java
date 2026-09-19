package com.ridex.wallet.dto;

/**
 * The driver's wallet: the ledger balance, the limit below which offers stop, and what clearing
 * it would take. A negative balance is platform fees on cash the driver kept.
 */
public record WalletResponse(
        String currency,
        long balanceMinor,
        long limitMinor,
        // What a top-up collects: everything owed, so the wallet lands back at zero.
        long dueMinor,
        boolean blocked) {
}

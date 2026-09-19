package com.ridex.wallet.dto;

/** What the app needs to open the gateway's checkout. The key id is publishable, not a secret. */
public record TopUpCheckout(String topUpId, String orderId, String keyId, long amountMinor, String currency) {
}

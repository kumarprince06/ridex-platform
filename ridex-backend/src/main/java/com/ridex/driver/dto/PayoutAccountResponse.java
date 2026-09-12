package com.ridex.driver.dto;

import java.time.Instant;

/**
 * The destination as it is shown back.
 *
 * <p>Masked: the driver only needs to recognise which account it is, and a full number on a screen
 * in a mounted phone is a number anybody standing next to the car can read.
 */
public record PayoutAccountResponse(
        boolean set,
        String accountHolder,
        String accountNumberMasked,
        String ifsc,
        Instant updatedAt) {

    public static final PayoutAccountResponse NONE =
            new PayoutAccountResponse(false, null, null, null, null);

    public static String mask(String accountNumber) {
        int visible = 4;
        return accountNumber.length() <= visible
                ? accountNumber
                : "*".repeat(accountNumber.length() - visible) + accountNumber.substring(accountNumber.length() - visible);
    }
}

package com.ridex.driver.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Where a driver's earnings should be sent.
 *
 * <p>Validated here rather than at payout time: a typo found on the day the money moves is a
 * returned transfer and a week's wait, and the driver is not in the room to fix it.
 */
public record PayoutAccountRequest(
        @NotBlank(message = "The account holder's name is required")
        @Size(max = 120)
        String accountHolder,

        // Digits only, and long enough to be an account rather than a typo. Indian account numbers
        // run 9-18 digits; the column is wider so an IBAN fits the day this leaves India.
        @NotBlank(message = "An account number is required")
        @Pattern(regexp = "\\d{9,18}", message = "An account number is 9 to 18 digits")
        String accountNumber,

        // The RBI's format: four letters, a zero, then the branch code.
        @NotBlank(message = "An IFSC code is required")
        @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$",
                message = "An IFSC code is four letters, a zero, then six characters")
        String ifsc) {
}

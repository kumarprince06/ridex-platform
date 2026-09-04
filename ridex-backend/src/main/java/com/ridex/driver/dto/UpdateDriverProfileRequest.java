package com.ridex.driver.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Every field optional: this endpoint edits a profile, it does not replace an identity. Email is
// absent on purpose - changing it has to re-verify, which is its own flow.
public record UpdateDriverProfileRequest(
        @Size(max = 100, message = "First name must not exceed 100 characters")
        String firstName,

        @Size(max = 100, message = "Last name must not exceed 100 characters")
        String lastName,

        @Pattern(regexp = "^$|^\\+?[0-9 ()-]{7,30}$", message = "Phone number is not valid")
        String phone) {
}

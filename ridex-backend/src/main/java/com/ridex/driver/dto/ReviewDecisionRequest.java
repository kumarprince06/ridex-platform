package com.ridex.driver.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A rejection needs a reason, and the API refuses without one.
 *
 * <p>The console asks for it, but a client is not a control: the server has to be the thing that
 * will not record a decision nobody can explain.
 */
public record ReviewDecisionRequest(
        @NotBlank(message = "A reason is required")
        @Size(min = 12, max = 500, message = "Give a reason of at least 12 characters")
        String reason) {
}

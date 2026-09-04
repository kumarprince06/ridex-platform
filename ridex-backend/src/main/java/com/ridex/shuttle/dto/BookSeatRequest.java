package com.ridex.shuttle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record BookSeatRequest(
        @NotBlank String scheduleId,
        /** ISO date. One departure runs per schedule per day. */
        @NotBlank @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "Use a date like 2026-09-05")
        String serviceDate,
        @NotBlank String boardingStopId,
        @NotBlank String alightingStopId,
        // Chosen by the rider, not assigned. Somebody who wants the window seat should get it.
        @NotBlank @Pattern(regexp = "[0-9]{1,2}[A-D]", message = "Seats look like 4A")
        String seatLabel) {
}

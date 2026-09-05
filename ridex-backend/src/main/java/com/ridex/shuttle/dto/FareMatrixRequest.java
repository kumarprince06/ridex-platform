package com.ridex.shuttle.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The whole fare table for a route, in one save.
 *
 * <p>Replaces rather than merges: a matrix editor shows every leg at once, so what it sends is the
 * complete answer. A pair the operator cleared is a leg that is no longer sold, and merging would
 * leave it priced with no way to remove it.
 */
public record FareMatrixRequest(
        @NotBlank(message = "Currency is required")
        @Size(min = 3, max = 3, message = "Currency must be a 3-letter code")
        String currency,

        @NotNull(message = "Send the fares, even if the list is empty")
        @Valid
        List<Leg> fares) {

    public record Leg(
            @NotBlank(message = "The origin stop is required")
            String fromStopId,

            @NotBlank(message = "The destination stop is required")
            String toStopId,

            @Min(value = 0, message = "A fare cannot be negative")
            long fareMinor) {
    }
}

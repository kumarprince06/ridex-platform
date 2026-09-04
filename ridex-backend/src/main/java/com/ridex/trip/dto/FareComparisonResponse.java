package com.ridex.trip.dto;

import java.util.List;

import com.ridex.pricing.dto.FareLineResponse;

/**
 * The receipt: what was quoted, what was charged, and the difference, line for line.
 *
 * <p>This is the reason the estimate is stored rather than overwritten. Every competing platform
 * shows a single final number, and "why was I charged more" is the most common support contact in
 * ride-hailing.
 */
public record FareComparisonResponse(
        String currency,
        long quotedTotalMinor,
        long chargedTotalMinor,
        long differenceMinor,
        int quotedDistanceMeters,
        int actualDistanceMeters,
        List<FareLineResponse> quotedLines,
        List<FareLineResponse> chargedLines) {
}

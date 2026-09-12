package com.ridex.admin.dto;

/**
 * One on-duty driver on the live map.
 *
 * <p>Only drivers whose phone is actually reporting: a pin for somebody whose app died an hour ago
 * is ops looking at a city that is not there.
 */
public record LiveDriverResponse(
        String driverId,
        String name,
        String vehicle,
        String registrationNumber,
        double latitude,
        double longitude,
        /** Whether they are carrying somebody right now, which is what colours the marker. */
        boolean onTrip) {
}

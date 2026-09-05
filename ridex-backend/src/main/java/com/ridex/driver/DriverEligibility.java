package com.ridex.driver;

import org.springframework.stereotype.Component;

import com.ridex.vehicle.VehicleService;

import lombok.RequiredArgsConstructor;

/**
 * The one answer to "may this driver carry a passenger right now".
 *
 * <p>Approval alone was the whole check before this. It is not enough: a licence that expired last
 * month leaves the profile APPROVED, and a driver whose only car was rejected has nothing to drive.
 * Asking in one place is what stops the three conditions drifting apart between dispatch, duty and
 * the console.
 */
@Component
@RequiredArgsConstructor
public class DriverEligibility {

    private final DriverProfileRepository driverProfileRepository;
    private final DriverDocumentService driverDocumentService;
    private final VehicleService vehicleService;

    /** @return null when eligible, otherwise the reason, worded for the driver to read. */
    public String blockedReason(String driverId) {
        boolean approved = driverProfileRepository.findById(driverId)
                .map(profile -> profile.getOnboardingStatus().isEligibleToDrive())
                .orElse(false);

        if (!approved) {
            return "Your account is not approved to drive yet.";
        }
        if (!driverDocumentService.hasValidRequiredDocuments(driverId)) {
            return "One of your documents is missing, rejected or expired.";
        }
        if (!vehicleService.hasActiveVehicle(driverId)) {
            return "You have no approved vehicle to drive.";
        }
        return null;
    }

    public boolean isEligible(String driverId) {
        return blockedReason(driverId) == null;
    }
}

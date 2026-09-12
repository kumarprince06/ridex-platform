package com.ridex.admin;

import org.springframework.stereotype.Component;

import com.ridex.admin.dto.AdminDriverResponse;
import com.ridex.admin.dto.AdminPaymentResponse;
import com.ridex.admin.dto.AdminRiderResponse;
import com.ridex.admin.dto.AdminTripResponse;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.payment.domain.Payment;
import com.ridex.ride.domain.RideRequest;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.trip.TripRepository;

import lombok.RequiredArgsConstructor;

/**
 * One row, one shape.
 *
 * <p>A list row and a detail header show the same fields, so they are built by the same function -
 * two copies drift, and the day they do the console shows one number in the table and another on
 * the page it opens.
 */
@Component
@RequiredArgsConstructor
class AdminRowMapper {

    private final DriverProfileRepository driverProfileRepository;
    private final TripRepository tripRepository;

    AdminRiderResponse toRider(RiderProfile profile) {
        var user = profile.getUser();
        return new AdminRiderResponse(
                profile.getId(), user.getId(), user.getEmail(), user.getFirstName(),
                user.getLastName(), user.getPhone(), user.getStatus().name(),
                user.getLastLoginAt(), profile.getCreatedAt());
    }

    AdminDriverResponse toDriver(DriverProfile profile) {
        var user = profile.getUser();
        return new AdminDriverResponse(
                profile.getId(), user.getId(), user.getEmail(), user.getFirstName(),
                user.getLastName(), user.getPhone(), profile.getOnboardingStatus(),
                profile.isOnDuty(), profile.getRating(), profile.getRatingCount(),
                profile.getCreatedAt());
    }

    AdminTripResponse toTrip(RideRequest ride) {
        // Driver email only once one is assigned; a searching ride has none, and inventing a
        // placeholder would make an unassigned ride look assigned in a list.
        String driverEmail = ride.getAssignedDriverId() == null
                ? null
                : driverProfileRepository.findById(ride.getAssignedDriverId())
                        .map(driver -> driver.getUser().getEmail())
                        .orElse(null);

        Long finalFare = tripRepository.findByRideRequestId(ride.getId())
                .map(trip -> trip.getFinalFareMinor())
                .orElse(null);

        return new AdminTripResponse(
                ride.getId(), ride.getStatus(), ride.getRideType().getCode(),
                ride.getRider().getUser().getEmail(), driverEmail,
                ride.getPickupAddress(), ride.getDestinationAddress(),
                ride.getCurrency(), ride.getQuotedFareMinor(), finalFare, ride.getRequestedAt());
    }

    AdminPaymentResponse toPayment(Payment payment) {
        return new AdminPaymentResponse(
                payment.getId(),
                // A shuttle seat has no trip. Reading through it here took the whole payments
                // page down with a null pointer the moment the first seat was paid for.
                payment.getTrip() == null ? null : payment.getTrip().getId(),
                payment.getShuttleBookingId(),
                payment.getRider().getUser().getEmail(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getCurrency(),
                payment.getGrossAmountMinor(),
                payment.getDiscountAmountMinor(),
                payment.getNetAmountMinor(),
                payment.getCreatedAt(),
                payment.getPaidAt());
    }
}

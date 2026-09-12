package com.ridex.driver;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.driver.domain.DriverProfile;
import com.ridex.vehicle.DriverVehicleRepository;
import com.ridex.vehicle.domain.DriverVehicle;

import lombok.RequiredArgsConstructor;

/**
 * Who is driving, and what they are driving, in the words a passenger uses.
 *
 * <p>Shared by the shuttle's crew card and the ride's driver card because a rider standing at the
 * kerb asks the same question either way - which car is mine - and two copies of "how do we render
 * a driver" is how one of them ends up showing an email address.
 */
@Component
@RequiredArgsConstructor
public class DriverCard {

    /** Nothing internal: a name to greet, a rating to judge by, and a plate to look for. */
    public record Card(
            String name,
            String phone,
            String rating,
            String vehicle,
            String registrationNumber,
            int seatCapacity) {
    }

    private final DriverProfileRepository driverProfileRepository;
    private final DriverVehicleRepository driverVehicleRepository;

    /**
     * Null when there is no crew yet - the app hides the card rather than showing blanks.
     *
     * <p>Transactional because the name lives on a lazy User, and callers that map this outside a
     * session have nothing left to load it with.
     */
    @Transactional(readOnly = true)
    public Card of(String driverId, String vehicleId) {
        if (driverId == null || vehicleId == null) {
            return null;
        }
        return build(driverProfileRepository.findById(driverId).orElse(null),
                driverVehicleRepository.findById(vehicleId).orElse(null));
    }

    /**
     * The same card for a dispatched ride, which names a driver but never a vehicle.
     *
     * <p>Their active vehicle, because that is the one they are approved to drive today. A driver
     * with none is a driver dispatch should not have offered the ride to.
     */
    @Transactional(readOnly = true)
    public Card forDriver(String driverId) {
        if (driverId == null) {
            return null;
        }
        DriverVehicle vehicle = driverVehicleRepository
                .findByDriverIdOrderByCreatedAtDesc(driverId).stream()
                .filter(candidate -> candidate.getStatus().isUsableForTrips())
                .findFirst()
                .orElse(null);
        return build(driverProfileRepository.findById(driverId).orElse(null), vehicle);
    }

    private Card build(DriverProfile driver, DriverVehicle vehicle) {
        if (driver == null || vehicle == null) {
            return null;
        }
        return new Card(
                // "Your driver" tells a rider nothing to check, but an email address is worse.
                driver.getUser().displayName().orElse("Your driver"),
                driver.getUser().getPhone(),
                driver.getRating() == null ? null : driver.getRating().toPlainString(),
                vehicle.getMake() + " " + vehicle.getModel(),
                vehicle.getRegistrationNumber(),
                vehicle.getSeatCapacity());
    }

}

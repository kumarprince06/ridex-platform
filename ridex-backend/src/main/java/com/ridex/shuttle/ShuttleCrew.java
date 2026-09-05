package com.ridex.shuttle;

import org.springframework.stereotype.Component;

import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.shuttle.dto.CrewResponse;
import com.ridex.vehicle.DriverVehicleRepository;
import com.ridex.vehicle.domain.DriverVehicle;

import lombok.RequiredArgsConstructor;

/** Turns the driver and vehicle ids carried on a schedule or a trip into something a rider reads. */
@Component
@RequiredArgsConstructor
public class ShuttleCrew {

    private final DriverProfileRepository driverProfileRepository;
    private final DriverVehicleRepository driverVehicleRepository;

    /**
     * Null when the departure has no crew yet - the app hides the card rather than showing blanks.
     *
     * <p>Transactional because the driver's name lives on a lazy User: the departures endpoint maps
     * this in the controller, where there is no session left to load it with.
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public CrewResponse of(String driverId, String vehicleId) {
        if (driverId == null || vehicleId == null) {
            return null;
        }

        DriverProfile driver = driverProfileRepository.findById(driverId).orElse(null);
        DriverVehicle vehicle = driverVehicleRepository.findById(vehicleId).orElse(null);
        if (driver == null || vehicle == null) {
            return null;
        }

        return new CrewResponse(
                nameOf(driver),
                driver.getUser().getPhone(),
                driver.getRating() == null ? null : driver.getRating().toPlainString(),
                vehicle.getMake() + " " + vehicle.getModel(),
                vehicle.getRegistrationNumber(),
                vehicle.getSeatCapacity());
    }

    private String nameOf(DriverProfile driver) {
        String first = driver.getUser().getFirstName();
        String last = driver.getUser().getLastName();
        String name = ((first == null ? "" : first) + " " + (last == null ? "" : last)).trim();
        // An email is a worse name than none, but "your driver" tells a rider nothing to check.
        return name.isEmpty() ? "Your driver" : name;
    }
}

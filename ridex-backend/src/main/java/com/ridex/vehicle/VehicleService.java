package com.ridex.vehicle;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.ForbiddenException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.vehicle.domain.DriverVehicle;
import com.ridex.vehicle.domain.VehicleStatus;
import com.ridex.vehicle.dto.AddVehicleRequest;
import com.ridex.vehicle.dto.VehicleResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final DriverVehicleRepository driverVehicleRepository;
    private final DriverProfileRepository driverProfileRepository;

    @Transactional(readOnly = true)
    public List<VehicleResponse> mine(String driverUserId) {
        return driverVehicleRepository
                .findByDriverIdOrderByCreatedAtDesc(requireDriver(driverUserId).getId())
                .stream().map(VehicleResponse::of).toList();
    }

    @Transactional
    public VehicleResponse add(String driverUserId, AddVehicleRequest request) {
        DriverProfile driver = requireDriver(driverUserId);

        // Plates are compared with case and spacing removed: "KA 01 AB 1234" and "ka01ab1234" are
        // the same car, and the unique index would happily store both.
        String registration = normalise(request.registrationNumber());
        if (driverVehicleRepository.existsByRegistrationNumber(registration)) {
            throw new ConflictException("That registration number is already on the platform.");
        }

        int thisYear = LocalDate.now(ZoneOffset.UTC).getYear();
        if (request.manufactureYear() > thisYear + 1) {
            throw new ValidationException("Manufacture year cannot be in the future.");
        }

        int maxSeats = request.vehicleType().maxSeats();
        if (request.seatCapacity() > maxSeats) {
            throw new ValidationException("A %s carries at most %d passengers."
                    .formatted(request.vehicleType().name().toLowerCase(Locale.ROOT).replace('_', ' '),
                            maxSeats));
        }

        DriverVehicle vehicle = new DriverVehicle();
        vehicle.setDriver(driver);
        vehicle.setVehicleType(request.vehicleType());
        vehicle.setMake(request.make().trim());
        vehicle.setModel(request.model().trim());
        vehicle.setManufactureYear((short) request.manufactureYear());
        vehicle.setColor(request.color() == null ? null : request.color().trim());
        vehicle.setSeatCapacity((short) request.seatCapacity());
        vehicle.setRegistrationNumber(registration);

        return VehicleResponse.of(driverVehicleRepository.save(vehicle));
    }

    /** A driver taking their own car off the road. Reactivating needs a review, so this is one way. */
    @Transactional
    public VehicleResponse deactivate(String driverUserId, String vehicleId) {
        DriverVehicle vehicle = requireOwned(driverUserId, vehicleId);
        vehicle.setStatus(VehicleStatus.INACTIVE);
        return VehicleResponse.of(driverVehicleRepository.save(vehicle));
    }

    /** Whether the driver has a car they are actually allowed to carry passengers in. */
    @Transactional(readOnly = true)
    public boolean hasActiveVehicle(String driverId) {
        return driverVehicleRepository.existsByDriverIdAndStatus(driverId, VehicleStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> forDriver(String driverId) {
        return driverVehicleRepository.findByDriverIdOrderByCreatedAtDesc(driverId)
                .stream().map(VehicleResponse::of).toList();
    }

    @Transactional
    public VehicleResponse review(String vehicleId, boolean approved) {
        DriverVehicle vehicle = driverVehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new NotFoundException("No such vehicle."));
        vehicle.setStatus(approved ? VehicleStatus.ACTIVE : VehicleStatus.REJECTED);
        return VehicleResponse.of(driverVehicleRepository.save(vehicle));
    }

    private DriverVehicle requireOwned(String driverUserId, String vehicleId) {
        DriverVehicle vehicle = driverVehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new NotFoundException("No such vehicle."));

        // Separate answers on purpose: "not yours" and "does not exist" are different facts, and
        // the driver deserves the one that is true.
        if (!vehicle.getDriver().getId().equals(requireDriver(driverUserId).getId())) {
            throw new ForbiddenException("That vehicle belongs to another driver.");
        }
        return vehicle;
    }

    private DriverProfile requireDriver(String driverUserId) {
        return driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."));
    }

    private static String normalise(String registration) {
        return registration.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
    }
}

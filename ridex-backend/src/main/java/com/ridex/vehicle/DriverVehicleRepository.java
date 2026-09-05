package com.ridex.vehicle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.vehicle.domain.DriverVehicle;
import com.ridex.vehicle.domain.VehicleStatus;

public interface DriverVehicleRepository extends JpaRepository<DriverVehicle, String> {

    List<DriverVehicle> findByDriverIdOrderByCreatedAtDesc(String driverId);

    boolean existsByDriverIdAndStatus(String driverId, VehicleStatus status);

    boolean existsByRegistrationNumber(String registrationNumber);
}

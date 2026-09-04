package com.ridex.trip;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.trip.domain.Trip;

public interface TripRepository extends JpaRepository<Trip, String> {

    Optional<Trip> findByRideRequestId(String rideRequestId);

    // Scoped by driver: an ownership check nobody can forget to write.
    Optional<Trip> findByIdAndDriverId(String id, String driverId);
}

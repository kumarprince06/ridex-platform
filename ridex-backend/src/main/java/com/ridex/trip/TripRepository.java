package com.ridex.trip;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.trip.domain.Trip;

public interface TripRepository extends JpaRepository<Trip, String> {

    Optional<Trip> findByRideRequestId(String rideRequestId);

    // Scoped by driver: an ownership check nobody can forget to write.
    Optional<Trip> findByIdAndDriverId(String id, String driverId);

    /** This driver's history, newest first. Fifty is more than anybody scrolls in one sitting. */
    java.util.List<Trip> findTop50ByDriverIdOrderByCreatedAtDesc(String driverId);
}

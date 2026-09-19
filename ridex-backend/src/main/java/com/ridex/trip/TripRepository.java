package com.ridex.trip;

import java.util.Collection;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.ride.domain.RideStatus;
import com.ridex.trip.domain.Trip;

public interface TripRepository extends JpaRepository<Trip, String> {

    Optional<Trip> findByRideRequestId(String rideRequestId);

    // Scoped by driver: an ownership check nobody can forget to write.
    Optional<Trip> findByIdAndDriverId(String id, String driverId);

    /** The trip a driver is in the middle of, so a relaunched app can resume it. */
    Optional<Trip> findFirstByDriverIdAndRideRequestStatusInOrderByCreatedAtDesc(
            String driverId, Collection<RideStatus> statuses);

    /** This driver's history, newest first. Fifty is more than anybody scrolls in one sitting. */
    java.util.List<Trip> findTop50ByDriverIdOrderByCreatedAtDesc(String driverId);
}

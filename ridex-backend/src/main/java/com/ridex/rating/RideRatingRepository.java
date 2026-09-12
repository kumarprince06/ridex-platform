package com.ridex.rating;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RideRatingRepository extends JpaRepository<RideRating, String> {

    boolean existsByRideId(String rideId);

    java.util.Optional<RideRating> findByRideId(String rideId);

    /** What riders said about this driver, newest first - the driver's ratings screen. */
    java.util.List<RideRating> findTop50ByDriverIdOrderByCreatedAtDesc(String driverId);
}

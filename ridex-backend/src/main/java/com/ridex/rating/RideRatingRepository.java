package com.ridex.rating;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RideRatingRepository extends JpaRepository<RideRating, String> {

    boolean existsByRideId(String rideId);
}

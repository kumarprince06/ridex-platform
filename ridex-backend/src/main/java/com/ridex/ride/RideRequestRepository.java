package com.ridex.ride;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.ride.domain.RideRequest;

public interface RideRequestRepository extends JpaRepository<RideRequest, String> {

    List<RideRequest> findByRiderIdOrderByRequestedAtDesc(String riderId);

    // Scoped by rider as well as id: an ownership check nobody can forget to write.
    Optional<RideRequest> findByIdAndRiderId(String id, String riderId);

    boolean existsByFareEstimateId(String fareEstimateId);
}

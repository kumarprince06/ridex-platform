package com.ridex.ride;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.ride.domain.CancellationPolicy;
import com.ridex.ride.domain.CancelledBy;
import com.ridex.ride.domain.RideStatus;

public interface CancellationPolicyRepository extends JpaRepository<CancellationPolicy, String> {

    Optional<CancellationPolicy> findByCancelledByAndFromStatusAndActiveTrue(
            CancelledBy cancelledBy, RideStatus fromStatus);
}

package com.ridex.payment;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.payment.domain.RiderDue;

public interface RiderDueRepository extends JpaRepository<RiderDue, String> {

    List<RiderDue> findByRiderIdAndStatus(String riderId, String status);

    Optional<RiderDue> findBySourceTypeAndSourceId(String sourceType, String sourceId);
}

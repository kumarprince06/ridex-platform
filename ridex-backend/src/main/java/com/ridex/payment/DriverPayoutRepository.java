package com.ridex.payment;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.payment.domain.DriverPayout;
import com.ridex.payment.domain.PayoutStatus;

public interface DriverPayoutRepository extends JpaRepository<DriverPayout, String> {

    List<DriverPayout> findByDriverIdOrderByCreatedAtDesc(String driverId);

    Page<DriverPayout> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<DriverPayout> findByStatusOrderByCreatedAtDesc(PayoutStatus status, Pageable pageable);
}

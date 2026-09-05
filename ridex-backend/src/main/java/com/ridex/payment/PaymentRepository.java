package com.ridex.payment;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.payment.domain.Payment;
import com.ridex.payment.domain.PaymentStatus;

public interface PaymentRepository extends JpaRepository<Payment, String> {

    Optional<Payment> findByTripId(String tripId);

    Optional<Payment> findByProviderPaymentId(String providerPaymentId);

    Page<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Payment> findByStatusOrderByCreatedAtDesc(PaymentStatus status, Pageable pageable);

    /**
     * What a rider still owes.
     *
     * <p>Cash never appears here: the driver was handed the money, so those rows are SUCCEEDED the
     * moment they are written. These are online fares where checkout was abandoned, failed, or
     * never confirmed - the rider got out of the car without paying.
     */
    @org.springframework.data.jpa.repository.Query("""
            SELECT p FROM Payment p
            WHERE p.rider.id = :riderId
              AND p.netAmountMinor > 0
              AND p.status IN (
                  com.ridex.payment.domain.PaymentStatus.CREATED,
                  com.ridex.payment.domain.PaymentStatus.REQUIRES_ACTION,
                  com.ridex.payment.domain.PaymentStatus.PROCESSING,
                  com.ridex.payment.domain.PaymentStatus.FAILED)
            ORDER BY p.createdAt ASC
            """)
    java.util.List<Payment> findOutstanding(
            @org.springframework.data.repository.query.Param("riderId") String riderId);
}

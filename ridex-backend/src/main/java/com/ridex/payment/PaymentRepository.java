package com.ridex.payment;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.payment.domain.Payment;
import com.ridex.payment.domain.PaymentStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, String> {

    Optional<Payment> findByTripId(String tripId);

    Optional<Payment> findByProviderPaymentId(String providerPaymentId);

    Optional<Payment> findByShuttleBookingId(String shuttleBookingId);

    Optional<Payment> findByPassId(String passId);

    long countByStatusAndCreatedAtAfter(PaymentStatus status, Instant since);

    // The worker's queue depth. next_attempt_at is only set on trip payments it owns.
    long countByStatusAndNextAttemptAtIsNotNull(PaymentStatus status);

    Page<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Payment> findByStatusOrderByCreatedAtDesc(PaymentStatus status, Pageable pageable);

    /**
     * What a rider still owes.
     *
     * <p>Cash never appears here: the driver was handed the money, so those rows are SUCCEEDED the
     * moment they are written. These are online fares where checkout was abandoned, failed, or
     * never confirmed - the rider got out of the car without paying.
     *
     * <p>Shuttle seats never appear here either, and that is the difference between the two: a
     * trip is charged after it has been taken, so an unpaid one is a debt. A seat is charged
     * before it is used - abandon checkout and the hold simply expires, nothing was consumed.
     * Counting one blocked every later booking over a seat the rider never got. A pass is the
     * same: an abandoned purchase reserves nothing and carried nobody, so locking somebody out of
     * the platform over it is a punishment for browsing.
     */
    @Query("""
            SELECT p FROM Payment p
            WHERE p.rider.id = :riderId
              AND p.shuttleBookingId IS NULL
              AND p.passId IS NULL
              AND p.netAmountMinor > 0
              AND p.status IN (
                  PaymentStatus.CREATED,
                  PaymentStatus.REQUIRES_ACTION,
                  PaymentStatus.PROCESSING,
                  PaymentStatus.FAILED)
            ORDER BY p.createdAt ASC
            """)
    List<Payment> findOutstanding(
            @Param("riderId") String riderId);

    /**
     * Claims the oldest online payment whose gateway order is due to be opened.
     *
     * <p>SKIP LOCKED, so every node can run the worker and no two open the same order. NO KEY UPDATE,
     * not UPDATE: the key never changes, and a webhook inserting a payment_events row must not
     * queue behind a gateway call for its foreign key check.
     */
    @Query(value = """
            SELECT * FROM payments
            WHERE status = 'CREATED' AND next_attempt_at <= :now
            ORDER BY next_attempt_at
            LIMIT 1
            FOR NO KEY UPDATE SKIP LOCKED
            """, nativeQuery = true)
    Optional<Payment> claimNextDue(@Param("now") Instant now);

    /** The same claim for one payment, so a trip that just ended does not wait for the next poll. */
    @Query(value = """
            SELECT * FROM payments
            WHERE id = :id AND status = 'CREATED' AND next_attempt_at IS NOT NULL
            FOR NO KEY UPDATE SKIP LOCKED
            """, nativeQuery = true)
    Optional<Payment> claimIfDue(@Param("id") String id);
}

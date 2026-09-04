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
}

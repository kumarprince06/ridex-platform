package com.ridex.payment;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.payment.domain.Refund;

public interface RefundRepository extends JpaRepository<Refund, String> {

    @Query("SELECT COALESCE(SUM(r.amountMinor), 0) FROM Refund r WHERE r.paymentId = :paymentId")
    long refundedOn(@Param("paymentId") String paymentId);

    List<Refund> findByPaymentIdOrderByCreatedAtDesc(String paymentId);
}

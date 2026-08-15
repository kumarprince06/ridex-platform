package com.ridex.infrastructure.persistence.jpa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.domain.subscription.Settlement;

public interface SettlementRepository extends JpaRepository<Settlement, String> {

    List<Settlement> findByTenantId(String tenantId);

    Optional<Settlement> findByInvoiceId(String invoiceId);

    Optional<Settlement> findByPaymentId(String paymentId);
}

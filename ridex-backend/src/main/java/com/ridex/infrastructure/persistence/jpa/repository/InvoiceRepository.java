package com.ridex.infrastructure.persistence.jpa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.domain.subscription.Invoice;
import com.ridex.domain.subscription.InvoiceStatus;

public interface InvoiceRepository extends JpaRepository<Invoice, String> {

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    List<Invoice> findByTenantId(String tenantId);

    List<Invoice> findByStatus(InvoiceStatus status);

    Optional<Invoice> findByPaymentId(String paymentId);
}

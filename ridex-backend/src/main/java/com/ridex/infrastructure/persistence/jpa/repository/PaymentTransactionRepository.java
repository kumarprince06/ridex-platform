package com.ridex.infrastructure.persistence.jpa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.domain.subscription.PaymentTransaction;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, String> {

    List<PaymentTransaction> findByTenantId(String tenantId);

    Optional<PaymentTransaction> findByReferenceId(String referenceId);

    Optional<PaymentTransaction> findByProviderPaymentId(String providerPaymentId);
}

package com.ridex.infrastructure.persistence.jpa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.domain.subscription.SubscriptionPayment;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, String> {

    List<SubscriptionPayment> findByTenantId(String tenantId);

    List<SubscriptionPayment> findBySubscriptionId(String subscriptionId);

    Optional<SubscriptionPayment> findByProviderPaymentId(String providerPaymentId);
}

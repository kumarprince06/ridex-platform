package com.ridex.infrastructure.persistence.jpa.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.domain.subscription.TenantSubscription;

public interface TenantSubscriptionRepository extends JpaRepository<TenantSubscription, String> {

    Optional<TenantSubscription> findByTenantId(String tenantId);

    Optional<TenantSubscription> findByTenantIdAndSubscriptionPlanId(String tenantId, String planId);
}

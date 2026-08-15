package com.ridex.infrastructure.persistence.jpa.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.domain.subscription.SubscriptionPlan;

public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, String> {

    Optional<SubscriptionPlan> findByCode(String code);

    List<SubscriptionPlan> findByIsActiveTrue();
}

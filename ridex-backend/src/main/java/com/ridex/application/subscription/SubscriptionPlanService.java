package com.ridex.application.subscription;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.api.dto.subscription.SubscriptionPlanResponse;
import com.ridex.application.tenant.TenantAccessService;
import com.ridex.domain.subscription.SubscriptionPlan;
import com.ridex.domain.subscription.TenantSubscription;
import com.ridex.domain.subscription.TenantSubscriptionStatus;
import com.ridex.domain.tenant.Tenant;
import com.ridex.infrastructure.persistence.jpa.repository.SubscriptionPlanRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantSubscriptionRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SubscriptionPlanService {

    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final TenantSubscriptionRepository tenantSubscriptionRepository;
    private final TenantRepository tenantRepository;
    private final TenantAccessService tenantAccessService;

    @Transactional(readOnly = true)
    public List<SubscriptionPlanResponse> getActivePlans() {
        return subscriptionPlanRepository.findByIsActiveTrue()
                .stream()
                .map(SubscriptionPlanResponse::from)
                .toList();
    }

    @Transactional
    public TenantSubscription selectPlan(String tenantId, String planCode) {
        tenantAccessService.requireTenantAccess(tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));

        SubscriptionPlan plan = subscriptionPlanRepository.findByCode(planCode)
                .orElseThrow(() -> new EntityNotFoundException("Subscription plan not found: " + planCode));

        if (!Boolean.TRUE.equals(plan.getIsActive())) {
            throw new IllegalStateException("Subscription plan is not active");
        }

        tenantSubscriptionRepository.findByTenantId(tenantId)
                .ifPresent(existing -> {
                    throw new IllegalStateException("Tenant already has an active subscription plan");
                });

        Instant now = Instant.now();
        TenantSubscription tenantSubscription = new TenantSubscription();
        tenantSubscription.setTenant(tenant);
        tenantSubscription.setSubscriptionPlan(plan);
        tenantSubscription.setStatus(TenantSubscriptionStatus.TRIAL);
        tenantSubscription.setStartedAt(now);
        tenantSubscription.setCurrentPeriodStart(now);
        tenantSubscription.setCurrentPeriodEnd(now.plus(plan.getTrialDays() > 0 ? plan.getTrialDays() : 30, ChronoUnit.DAYS));
        tenantSubscription.setTrialStartAt(now);
        tenantSubscription.setTrialEndAt(plan.getTrialDays() > 0 ? now.plus(plan.getTrialDays(), ChronoUnit.DAYS) : null);

        return tenantSubscriptionRepository.save(tenantSubscription);
    }
}

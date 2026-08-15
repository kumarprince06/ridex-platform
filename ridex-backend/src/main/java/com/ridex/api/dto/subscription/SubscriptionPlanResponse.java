package com.ridex.api.dto.subscription;

import java.math.BigDecimal;

import com.ridex.domain.subscription.BillingInterval;
import com.ridex.domain.subscription.SubscriptionPlan;

public record SubscriptionPlanResponse(
        String id,
        String code,
        String name,
        String description,
        BillingInterval billingInterval,
        BigDecimal priceAmount,
        String currencyCode,
        Integer trialDays,
        Boolean isActive) {

    public static SubscriptionPlanResponse from(SubscriptionPlan plan) {
        return new SubscriptionPlanResponse(
                plan.getId(),
                plan.getCode(),
                plan.getName(),
                plan.getDescription(),
                plan.getBillingInterval(),
                plan.getPriceAmount(),
                plan.getCurrencyCode(),
                plan.getTrialDays(),
                plan.getIsActive());
    }
}

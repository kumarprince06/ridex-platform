package com.ridex.api.controller.subscription;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.api.dto.subscription.SelectSubscriptionPlanRequest;
import com.ridex.api.dto.subscription.SubscriptionPlanResponse;
import com.ridex.application.subscription.SubscriptionPlanService;
import com.ridex.domain.subscription.TenantSubscription;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
public class SubscriptionPlanController {

    private final SubscriptionPlanService subscriptionPlanService;

    @GetMapping("/plans")
    @ResponseStatus(HttpStatus.OK)
    public List<SubscriptionPlanResponse> getActivePlans() {
        return subscriptionPlanService.getActivePlans();
    }

    @PostMapping("/{tenantId}/plans/select")
    @ResponseStatus(HttpStatus.CREATED)
    public TenantSubscription selectPlan(
            @PathVariable String tenantId,
            @Valid @RequestBody SelectSubscriptionPlanRequest request) {
        return subscriptionPlanService.selectPlan(tenantId, request.planCode());
    }
}

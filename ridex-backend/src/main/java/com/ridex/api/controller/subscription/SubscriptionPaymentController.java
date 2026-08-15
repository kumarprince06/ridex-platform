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

import com.ridex.api.dto.subscription.CreatePaymentSessionRequest;
import com.ridex.application.subscription.SubscriptionPaymentService;
import com.ridex.domain.subscription.SubscriptionPayment;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
public class SubscriptionPaymentController {

    private final SubscriptionPaymentService subscriptionPaymentService;

    @GetMapping("/{tenantId}/payments")
    @ResponseStatus(HttpStatus.OK)
    public List<SubscriptionPayment> getPaymentsForTenant(@PathVariable String tenantId) {
        return subscriptionPaymentService.getPaymentsForTenant(tenantId);
    }

    @PostMapping("/{tenantId}/subscriptions/{subscriptionId}/payments/session")
    @ResponseStatus(HttpStatus.CREATED)
    public SubscriptionPayment createPaymentSession(
            @PathVariable String tenantId,
            @PathVariable String subscriptionId,
            @Valid @RequestBody CreatePaymentSessionRequest request) {
        return subscriptionPaymentService.createPaymentSession(tenantId, subscriptionId, request.paymentProvider());
    }
}

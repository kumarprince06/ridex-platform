package com.ridex.application.subscription;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.application.tenant.TenantAccessService;
import com.ridex.domain.subscription.PaymentProviderType;
import com.ridex.domain.subscription.SubscriptionPayment;
import com.ridex.domain.subscription.SubscriptionPaymentStatus;
import com.ridex.domain.subscription.SubscriptionPlan;
import com.ridex.domain.subscription.TenantSubscription;
import com.ridex.domain.tenant.Tenant;
import com.ridex.infrastructure.payment.PaymentGateway;
import com.ridex.infrastructure.payment.PaymentGatewayRegistry;
import com.ridex.infrastructure.persistence.jpa.repository.SubscriptionPaymentRepository;
import com.ridex.infrastructure.persistence.jpa.repository.SubscriptionPlanRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantSubscriptionRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SubscriptionPaymentService {

    private final TenantRepository tenantRepository;
    private final TenantSubscriptionRepository tenantSubscriptionRepository;
    private final SubscriptionPaymentRepository paymentRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final PaymentGatewayRegistry paymentGatewayRegistry;
    private final TenantAccessService tenantAccessService;

    @Transactional(readOnly = true)
    public List<SubscriptionPayment> getPaymentsForTenant(String tenantId) {
        tenantAccessService.requireTenantAccess(tenantId);
        return paymentRepository.findByTenantId(tenantId);
    }

    @Transactional
    public SubscriptionPayment createPaymentSession(String tenantId, String subscriptionId, PaymentProviderType providerType) {
        tenantAccessService.requireTenantAccess(tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));

        TenantSubscription subscription = tenantSubscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new EntityNotFoundException("Subscription not found: " + subscriptionId));

        if (!tenant.getId().equals(subscription.getTenant().getId())) {
            throw new IllegalStateException("Subscription does not belong to the tenant");
        }

        SubscriptionPlan plan = subscription.getSubscriptionPlan();
        PaymentGateway gateway = paymentGatewayRegistry.getGateway(providerType);

        String providerPaymentId = gateway.createCheckoutSession(tenantId, subscriptionId, plan.getPriceAmount(), plan.getCurrencyCode());

        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setTenant(tenant);
        payment.setSubscription(subscription);
        payment.setAmount(plan.getPriceAmount());
        payment.setCurrencyCode(plan.getCurrencyCode());
        payment.setStatus(SubscriptionPaymentStatus.INITIATED);
        payment.setPaymentProvider(providerType);
        payment.setProviderPaymentId(providerPaymentId);
        payment.setInitiatedAt(Instant.now());
        payment.setPaymentMethod("checkout");

        return paymentRepository.save(payment);
    }

    @Transactional
    public SubscriptionPayment markPaymentAsPaid(String paymentId) {
        SubscriptionPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new EntityNotFoundException("Payment not found: " + paymentId));

        payment.setStatus(SubscriptionPaymentStatus.PAID);
        payment.setCompletedAt(Instant.now());
        return paymentRepository.save(payment);
    }
}

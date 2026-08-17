package com.ridex.application.subscription;

import java.time.Instant;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.security.access.AccessDeniedException;
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
    private final PaymentGatewayRegistry paymentGatewayRegistry;
    private final TenantAccessService tenantAccessService;
    private final InvoiceService invoiceService;

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
    public SubscriptionPayment markPaymentAsPaid(String tenantId, String paymentId) {
        tenantAccessService.requireTenantAccess(tenantId);

        SubscriptionPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new EntityNotFoundException("Payment not found: " + paymentId));

        if (payment.getTenant() == null || !tenantId.equals(payment.getTenant().getId())) {
            throw new IllegalStateException("Payment does not belong to the tenant");
        }

        if (payment.getStatus() == SubscriptionPaymentStatus.PAID) {
            return payment;
        }

        payment.setStatus(SubscriptionPaymentStatus.PAID);
        payment.setCompletedAt(Instant.now());
        SubscriptionPayment savedPayment = paymentRepository.save(payment);
        invoiceService.generateInvoiceForPayment(savedPayment.getId());
        return savedPayment;
    }

    @Transactional
    public SubscriptionPayment handleWebhook(String providerName, String payload, String signature) {
        PaymentProviderType providerType = PaymentProviderType.valueOf(providerName.trim().toUpperCase());
        PaymentGateway gateway = paymentGatewayRegistry.getGateway(providerType);

        if (!gateway.verifyWebhookSignature(payload, signature)) {
            throw new AccessDeniedException("Invalid payment webhook signature");
        }

        String providerPaymentId = extractProviderPaymentId(payload);
        if (providerPaymentId == null || providerPaymentId.isBlank()) {
            throw new IllegalArgumentException("Webhook payload missing provider payment identifier");
        }

        SubscriptionPayment payment = paymentRepository.findByProviderPaymentId(providerPaymentId)
                .orElseThrow(() -> new EntityNotFoundException("Payment not found for provider id: " + providerPaymentId));

        String normalizedPayload = payload.toLowerCase();
        if (normalizedPayload.contains("failed") || normalizedPayload.contains("declined") || normalizedPayload.contains("canceled")) {
            payment.setStatus(SubscriptionPaymentStatus.FAILED);
            payment.setCompletedAt(Instant.now());
            payment.setFailureReason("Provider reported failure for webhook event");
            return paymentRepository.save(payment);
        }

        payment.setStatus(SubscriptionPaymentStatus.PAID);
        payment.setCompletedAt(Instant.now());
        if (payment.getPaymentProvider() == null) {
            payment.setPaymentProvider(providerType);
        }

        SubscriptionPayment savedPayment = paymentRepository.save(payment);
        invoiceService.generateInvoiceForPayment(savedPayment.getId());
        return savedPayment;
    }

    private String extractProviderPaymentId(String payload) {
        if (payload == null || payload.isBlank()) {
            return null;
        }

        Pattern[] patterns = new Pattern[] {
                Pattern.compile("(?:providerPaymentId|provider_payment_id|paymentId|payment_id|checkoutSessionId|session_id)\\s*[:=]\\s*\\\"?([A-Za-z0-9_-]+)\\\"?", Pattern.CASE_INSENSITIVE),
                Pattern.compile("(?:providerPaymentId|provider_payment_id|paymentId|payment_id|checkoutSessionId|session_id)\\s*[:=]\\s*'([A-Za-z0-9_-]+)'", Pattern.CASE_INSENSITIVE),
                Pattern.compile("(?:providerPaymentId|provider_payment_id|paymentId|payment_id|checkoutSessionId|session_id)\\s*[:=]\\s*([A-Za-z0-9_-]+)", Pattern.CASE_INSENSITIVE)
        };

        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(payload);
            if (matcher.find()) {
                return matcher.group(1);
            }
        }

        return null;
    }
}

package com.ridex.application.subscription;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.application.tenant.TenantAccessService;
import com.ridex.domain.subscription.PaymentProviderType;
import com.ridex.domain.subscription.PaymentTransaction;
import com.ridex.domain.subscription.PaymentTransactionStatus;
import com.ridex.domain.subscription.PaymentTransactionType;
import com.ridex.domain.tenant.Tenant;
import com.ridex.infrastructure.persistence.jpa.repository.PaymentTransactionRepository;
import com.ridex.infrastructure.persistence.jpa.repository.TenantRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DriverPayoutService {

    private final TenantRepository tenantRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final TenantAccessService tenantAccessService;
    private final InvoiceService invoiceService;

    @Transactional(readOnly = true)
    public List<PaymentTransaction> getPayoutsForTenant(String tenantId) {
        tenantAccessService.requireTenantAccess(tenantId);
        return paymentTransactionRepository.findByTenantId(tenantId).stream()
                .filter(tx -> tx.getTransactionType() == PaymentTransactionType.DRIVER_PAYOUT)
                .toList();
    }

    @Transactional
    public PaymentTransaction createDriverPayout(
            String tenantId,
            String driverUserId,
            BigDecimal amount,
            String currencyCode,
            PaymentProviderType providerType) {

        tenantAccessService.requireTenantAccess(tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));

        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setTenant(tenant);
        transaction.setReferenceId(driverUserId);
        transaction.setTransactionType(PaymentTransactionType.DRIVER_PAYOUT);
        transaction.setStatus(PaymentTransactionStatus.INITIATED);
        transaction.setAmount(amount);
        transaction.setCurrencyCode(currencyCode);
        transaction.setPaymentProvider(providerType);
        transaction.setPaymentMethod("bank_transfer");
        transaction.setInitiatedAt(Instant.now());

        return paymentTransactionRepository.save(transaction);
    }

    @Transactional
    public PaymentTransaction completeDriverPayout(String tenantId, String payoutId) {
        tenantAccessService.requireTenantAccess(tenantId);

        PaymentTransaction transaction = paymentTransactionRepository.findById(payoutId)
                .orElseThrow(() -> new EntityNotFoundException("Driver payout not found: " + payoutId));

        if (!tenantId.equals(transaction.getTenant().getId())) {
            throw new IllegalStateException("Payout does not belong to the tenant");
        }

        if (transaction.getStatus() == PaymentTransactionStatus.PAID) {
            return transaction;
        }

        transaction.setStatus(PaymentTransactionStatus.PAID);
        transaction.setCompletedAt(Instant.now());

        PaymentTransaction saved = paymentTransactionRepository.save(transaction);
        invoiceService.generateInvoiceForDriverPayout(saved.getId());
        return saved;
    }
}

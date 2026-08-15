package com.ridex.application.subscription;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.api.dto.subscription.SettlementResponse;
import com.ridex.application.tenant.TenantAccessService;
import com.ridex.domain.subscription.Invoice;
import com.ridex.domain.subscription.Settlement;
import com.ridex.domain.subscription.SettlementStatus;
import com.ridex.domain.subscription.SubscriptionPayment;
import com.ridex.domain.subscription.SubscriptionPaymentStatus;
import com.ridex.infrastructure.persistence.jpa.repository.InvoiceRepository;
import com.ridex.infrastructure.persistence.jpa.repository.SettlementRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SettlementService {

    private final SettlementRepository settlementRepository;
    private final InvoiceRepository invoiceRepository;
    private final TenantAccessService tenantAccessService;

    @Transactional(readOnly = true)
    public List<SettlementResponse> getSettlementsForTenant(String tenantId) {
        tenantAccessService.requireTenantAccess(tenantId);
        return settlementRepository.findByTenantId(tenantId)
                .stream()
                .map(SettlementResponse::from)
                .toList();
    }

    @Transactional
    public SettlementResponse createSettlementForInvoice(String tenantId, String invoiceId) {
        tenantAccessService.requireTenantAccess(tenantId);

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + invoiceId));

        if (!tenantId.equals(invoice.getTenant().getId())) {
            throw new IllegalStateException("Invoice does not belong to the tenant");
        }

        SubscriptionPayment payment = invoice.getPayment();
        if (payment == null || payment.getStatus() != SubscriptionPaymentStatus.PAID) {
            throw new IllegalStateException("Settlement can only be created for a paid invoice");
        }

        Settlement existing = settlementRepository.findByInvoiceId(invoiceId).orElse(null);
        if (existing != null) {
            return SettlementResponse.from(existing);
        }

        Settlement settlement = new Settlement();
        settlement.setTenant(invoice.getTenant());
        settlement.setInvoice(invoice);
        settlement.setPayment(payment);
        settlement.setAmount(invoice.getTotalAmount());
        settlement.setCurrencyCode(invoice.getCurrencyCode());
        settlement.setStatus(SettlementStatus.PENDING);
        settlement.setProviderName(payment.getPaymentProvider() != null ? payment.getPaymentProvider().name() : "SYSTEM");
        settlement.setProviderReference(payment.getProviderPaymentId());

        return SettlementResponse.from(settlementRepository.save(settlement));
    }

    @Transactional
    public SettlementResponse completeSettlement(String tenantId, String settlementId) {
        tenantAccessService.requireTenantAccess(tenantId);

        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new EntityNotFoundException("Settlement not found: " + settlementId));

        if (!tenantId.equals(settlement.getTenant().getId())) {
            throw new IllegalStateException("Settlement does not belong to the tenant");
        }

        settlement.setStatus(SettlementStatus.COMPLETED);
        settlement.setCompletedAt(java.time.Instant.now());

        return SettlementResponse.from(settlementRepository.save(settlement));
    }
}

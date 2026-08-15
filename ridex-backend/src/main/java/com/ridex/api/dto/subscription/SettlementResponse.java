package com.ridex.api.dto.subscription;

import java.math.BigDecimal;
import java.time.Instant;

import com.ridex.domain.subscription.Settlement;
import com.ridex.domain.subscription.SettlementStatus;

public record SettlementResponse(
        String id,
        String tenantId,
        String invoiceId,
        String paymentId,
        BigDecimal amount,
        String currencyCode,
        SettlementStatus status,
        String providerName,
        String providerReference,
        Instant createdAt,
        Instant completedAt
) {
    public static SettlementResponse from(Settlement settlement) {
        return new SettlementResponse(
                settlement.getId(),
                settlement.getTenant() != null ? settlement.getTenant().getId() : null,
                settlement.getInvoice() != null ? settlement.getInvoice().getId() : null,
                settlement.getPayment() != null ? settlement.getPayment().getId() : null,
                settlement.getAmount(),
                settlement.getCurrencyCode(),
                settlement.getStatus(),
                settlement.getProviderName(),
                settlement.getProviderReference(),
                settlement.getCreatedAt(),
                settlement.getCompletedAt()
        );
    }
}

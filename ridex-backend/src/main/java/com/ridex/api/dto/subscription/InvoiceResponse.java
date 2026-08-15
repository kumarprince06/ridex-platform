package com.ridex.api.dto.subscription;

import java.math.BigDecimal;
import java.time.Instant;

import com.ridex.domain.subscription.Invoice;
import com.ridex.domain.subscription.InvoiceStatus;

public record InvoiceResponse(
        String id,
        String invoiceNumber,
        String tenantId,
        String subscriptionId,
        String paymentId,
        String paymentTransactionId,
        String invoiceType,
        Instant issueDate,
        Instant dueDate,
        BigDecimal totalAmount,
        BigDecimal taxAmount,
        BigDecimal discountAmount,
        String currencyCode,
        InvoiceStatus status,
        String pdfUrl
) {
    public static InvoiceResponse from(Invoice invoice) {
        return new InvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getTenant() != null ? invoice.getTenant().getId() : null,
                invoice.getSubscription() != null ? invoice.getSubscription().getId() : null,
                invoice.getPayment() != null ? invoice.getPayment().getId() : null,
                invoice.getPaymentTransaction() != null ? invoice.getPaymentTransaction().getId() : null,
                invoice.getPayment() != null && invoice.getPayment().getSubscription() != null ? "subscription" :
                        (invoice.getPaymentTransaction() != null ? invoice.getPaymentTransaction().getTransactionType().name() : "transaction"),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                invoice.getTotalAmount(),
                invoice.getTaxAmount(),
                invoice.getDiscountAmount(),
                invoice.getCurrencyCode(),
                invoice.getStatus(),
                invoice.getPdfUrl()
        );
    }
}

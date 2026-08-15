package com.ridex.application.subscription;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.domain.subscription.Invoice;
import com.ridex.domain.subscription.InvoiceStatus;
import com.ridex.domain.subscription.SubscriptionPayment;
import com.ridex.domain.subscription.SubscriptionPaymentStatus;
import com.ridex.infrastructure.persistence.jpa.repository.InvoiceRepository;
import com.ridex.infrastructure.persistence.jpa.repository.SubscriptionPaymentRepository;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final SubscriptionPaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;

    @Transactional
    public Invoice generateInvoiceForPayment(String paymentId) {
        SubscriptionPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new EntityNotFoundException("Payment not found: " + paymentId));

        if (payment.getStatus() != SubscriptionPaymentStatus.PAID) {
            throw new IllegalStateException("Invoice can only be generated for a successful payment");
        }

        return invoiceRepository.findByPaymentId(paymentId)
                .orElseGet(() -> {
                    Invoice invoice = new Invoice();
                    invoice.setId(UlidGenerator.generateUlid());
                    invoice.setInvoiceNumber(generateInvoiceNumber());
                    invoice.setTenant(payment.getTenant());
                    invoice.setSubscription(payment.getSubscription());
                    invoice.setPayment(payment);
                    invoice.setIssueDate(Instant.now());
                    invoice.setDueDate(Instant.now().plus(7, ChronoUnit.DAYS));
                    invoice.setTotalAmount(payment.getAmount());
                    invoice.setTaxAmount(BigDecimal.ZERO);
                    invoice.setDiscountAmount(BigDecimal.ZERO);
                    invoice.setCurrencyCode(payment.getCurrencyCode());
                    invoice.setStatus(InvoiceStatus.PAID);
                    return invoiceRepository.save(invoice);
                });
    }

    @Transactional(readOnly = true)
    public Invoice getInvoiceByPaymentId(String paymentId) {
        return invoiceRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found for payment: " + paymentId));
    }

    private String generateInvoiceNumber() {
        String date = LocalDate.now().toString().replace("-", "");
        return "INV-" + date + "-" + UlidGenerator.generateUlid().substring(0, 10).toUpperCase();
    }

}

package com.ridex.api.controller.subscription;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.api.dto.subscription.InvoiceResponse;
import com.ridex.application.subscription.InvoiceService;
import com.ridex.domain.subscription.Invoice;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping("/payments/{paymentId}/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public InvoiceResponse generateInvoice(@PathVariable String paymentId) {
        Invoice invoice = invoiceService.generateInvoiceForPayment(paymentId);
        return InvoiceResponse.from(invoice);
    }

    @GetMapping("/payments/{paymentId}")
    @ResponseStatus(HttpStatus.OK)
    public InvoiceResponse getInvoiceByPayment(@PathVariable String paymentId) {
        Invoice invoice = invoiceService.getInvoiceByPaymentId(paymentId);
        return InvoiceResponse.from(invoice);
    }
}

package com.ridex.api.controller.subscription;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.ridex.api.dto.subscription.SettlementResponse;
import com.ridex.application.subscription.SettlementService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    @GetMapping("/{tenantId}/settlements")
    @ResponseStatus(HttpStatus.OK)
    public List<SettlementResponse> getSettlements(@PathVariable String tenantId) {
        return settlementService.getSettlementsForTenant(tenantId);
    }

    @PostMapping("/{tenantId}/invoices/{invoiceId}/settlements")
    @ResponseStatus(HttpStatus.CREATED)
    public SettlementResponse createSettlement(
            @PathVariable String tenantId,
            @PathVariable String invoiceId) {
        return settlementService.createSettlementForInvoice(tenantId, invoiceId);
    }

    @PostMapping("/{tenantId}/settlements/{settlementId}/complete")
    @ResponseStatus(HttpStatus.OK)
    public SettlementResponse completeSettlement(
            @PathVariable String tenantId,
            @PathVariable String settlementId) {
        return settlementService.completeSettlement(tenantId, settlementId);
    }
}

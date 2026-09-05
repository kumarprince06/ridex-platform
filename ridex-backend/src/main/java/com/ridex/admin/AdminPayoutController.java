package com.ridex.admin;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.ridex.payment.PayoutService;
import com.ridex.payment.domain.PayoutStatus;
import com.ridex.payment.dto.PayoutResponse;
import com.ridex.payment.dto.SettlePayoutRequest;
import com.ridex.admin.dto.PageResponse;
import com.ridex.driver.dto.ReviewDecisionRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Payouts, for finance.
 *
 * <p>Operations cannot reach any of this. Approving a driver and moving money to them are separate
 * decisions on purpose (docs/07) - the same person doing both is how a platform gets robbed.
 */
@RestController
@RequestMapping("/api/v1/admin/payouts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('FINANCE', 'SUPER_ADMIN')")
public class AdminPayoutController {

    private final PayoutService payoutService;

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public PageResponse<PayoutResponse> list(
            @RequestParam(required = false) PayoutStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        var result = payoutService.list(status, page, size);
        return PageResponse.of(result, java.util.function.Function.identity());
    }

    /** One payout per driver with money owed. Safe to run twice - the second run finds nothing. */
    @PostMapping("/run")
    @ResponseStatus(HttpStatus.CREATED)
    public java.util.List<PayoutResponse> run() {
        return payoutService.runBatch();
    }

    @PostMapping("/{payoutId}/send")
    @ResponseStatus(HttpStatus.OK)
    public PayoutResponse send(@PathVariable String payoutId) {
        return payoutService.markProcessing(payoutId);
    }

    @PostMapping("/{payoutId}/settle")
    @ResponseStatus(HttpStatus.OK)
    public PayoutResponse settle(@PathVariable String payoutId,
            @Valid @RequestBody SettlePayoutRequest request) {
        return payoutService.markPaid(payoutId, request.reference());
    }

    @PostMapping("/{payoutId}/fail")
    @ResponseStatus(HttpStatus.OK)
    public PayoutResponse fail(@PathVariable String payoutId,
            @Valid @RequestBody ReviewDecisionRequest request) {
        return payoutService.markFailed(payoutId, request.reason());
    }
}

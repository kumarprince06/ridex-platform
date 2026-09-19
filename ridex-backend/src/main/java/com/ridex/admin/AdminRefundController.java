package com.ridex.admin;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ridex.admin.dto.CancelDepartureRequest;
import com.ridex.admin.dto.RefundRequest;
import com.ridex.payment.RefundService;
import com.ridex.platform.security.JwtPrincipal;
import com.ridex.shuttle.ShuttleService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** The two ways operations gives money back: one payment at a time, or a whole departure called off. */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPS_ADMIN', 'SUPER_ADMIN')")
public class AdminRefundController {

    private final RefundService refundService;
    private final ShuttleService shuttleService;

    @PostMapping("/payments/{paymentId}/refund")
    @ResponseStatus(HttpStatus.CREATED)
    @Audited(action = "REFUNDED_AS_POINTS", targetType = "PAYMENT")
    public Map<String, Object> refund(@PathVariable String paymentId, @AuthenticationPrincipal JwtPrincipal principal,
            @Valid @RequestBody RefundRequest request) {
        var refund = refundService.refundAsPoints(paymentId, request.amountMinor(), request.reason(), principal.userId());
        return Map.of("refundId", refund.getId(), "amountMinor", refund.getAmountMinor());
    }

    @PostMapping("/shuttle/departures/{shuttleTripId}/cancel")
    @ResponseStatus(HttpStatus.OK)
    @Audited(action = "DEPARTURE_CANCELLED", targetType = "SHUTTLE_TRIP")
    public Map<String, Object> cancelDeparture(@PathVariable String shuttleTripId,
            @Valid @RequestBody CancelDepartureRequest request) {
        return Map.of("seatsCancelled", shuttleService.cancelDeparture(shuttleTripId, request.reason()));
    }
}

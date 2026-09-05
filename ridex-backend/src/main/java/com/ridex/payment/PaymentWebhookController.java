package com.ridex.payment;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.ridex.payment.razorpay.RazorpayPaymentProvider;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Where Razorpay reports what actually happened.
 *
 * <p>Unauthenticated by necessity - a gateway has no bearer token - so the signature is the only
 * thing standing between this endpoint and anybody on the internet marking their own ride as paid.
 * It is checked before the body is parsed, because an unverified payload is attacker input.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payments/webhook")
@RequiredArgsConstructor
@PreAuthorize("permitAll()")
public class PaymentWebhookController {

    private final RazorpayPaymentProvider razorpay;
    private final PaymentWebhookService paymentWebhookService;

    /**
     * @param payload the raw body. Taken as a String, not a mapped object: the signature is over
     *                the exact bytes sent, and letting Jackson parse and re-serialise it would
     *                change whitespace and key order and break every verification.
     */
    @PostMapping
    public ResponseStatusOnly receive(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            @RequestHeader(value = "X-Razorpay-Event-Id", required = false) String eventId) {

        if (!razorpay.verifyWebhook(payload, signature)) {
            log.warn("Rejected a Razorpay webhook with an invalid signature");
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Invalid signature");
        }

        if (eventId == null || eventId.isBlank()) {
            // Without it there is nothing to deduplicate on, and a redelivery would be applied
            // twice. Refusing is safer than guessing an id from the body.
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Missing X-Razorpay-Event-Id");
        }

        boolean applied = paymentWebhookService.handle(payload, eventId);

        // 200 either way. A duplicate is a normal retry, and answering anything else makes the
        // gateway redeliver it until it gives up.
        return new ResponseStatusOnly(applied ? "applied" : "duplicate");
    }

    public record ResponseStatusOnly(String result) {
    }
}

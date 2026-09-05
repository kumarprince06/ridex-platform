package com.ridex.payment;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Boot 4 ships Jackson 3, whose ObjectMapper lives here. The com.fasterxml one is still on
// the classpath - jjwt pulls it in - but has no bean, which is a confusing way to fail.
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.ridex.payment.domain.Payment;
import com.ridex.payment.domain.PaymentEvent;
import com.ridex.payment.domain.PaymentStatus;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * What a gateway tells us after the fact.
 *
 * <p>This exists because the client cannot be the only witness. A rider who pays and immediately
 * closes the app never sends the confirmation call, and without a webhook that payment sits at
 * PENDING with the money already taken. Refunds are worse: they settle hours later and there is no
 * client in the loop at all.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentWebhookService {

    private static final String PROVIDER = "RAZORPAY";

    private final PaymentEventRepository paymentEventRepository;
    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;
    private final com.ridex.shuttle.ShuttleService shuttleService;
    private final com.ridex.shuttle.ShuttleBookingRepository shuttleBookingRepository;

    /**
     * Records one verified webhook and applies it.
     *
     * @return false when the event has been seen before, which is a normal gateway retry and not
     *         an error - the caller still answers 200, or the gateway keeps redelivering forever.
     */
    @Transactional
    public boolean handle(String payload, String eventId) {
        // The insert is the lock. Checking first and inserting after would let two concurrent
        // redeliveries both pass the check, and the unique index is what actually decides it.
        if (paymentEventRepository.existsByProviderAndProviderEventId(PROVIDER, eventId)) {
            log.debug("Razorpay event {} already handled", eventId);
            return false;
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(payload);
        } catch (Exception ex) {
            // Signed but unreadable. Recorded rather than dropped: a payload we cannot parse is a
            // contract change, and losing it means losing the evidence of one.
            record(eventId, "unparseable", null, payload);
            log.warn("Razorpay event {} could not be parsed", eventId, ex);
            return true;
        }

        String type = root.path("event").asText("");
        String providerPaymentId = paymentIdIn(root);

        Optional<Payment> payment = providerPaymentId == null
                ? Optional.empty()
                : paymentRepository.findByProviderPaymentId(providerPaymentId);

        record(eventId, type, payment.map(Payment::getId).orElse(null), payload);

        if (payment.isEmpty()) {
            // An order we never created, or a payment against an order id we store instead. Kept
            // for the audit trail; nothing to move.
            log.info("Razorpay event {} ({}) names no payment we hold", eventId, type);
            return true;
        }

        apply(payment.get(), type, root);
        return true;
    }

    /**
     * Moves the payment, and only ever forwards.
     *
     * <p>Gateways deliver out of order. Letting a late "authorized" overwrite a captured payment
     * would reopen a settled trip, so a terminal status is never walked back by a webhook.
     */
    private void apply(Payment payment, String type, JsonNode root) {
        PaymentStatus next = switch (type) {
            case "payment.captured" -> PaymentStatus.SUCCEEDED;
            case "payment.failed" -> PaymentStatus.FAILED;
            case "refund.processed" -> PaymentStatus.REFUNDED;
            case "refund.partial_processed" -> PaymentStatus.PARTIALLY_REFUNDED;
            case "payment.authorized" -> PaymentStatus.PROCESSING;
            default -> null;
        };

        if (next == null) {
            return;
        }
        if (payment.getStatus() == PaymentStatus.SUCCEEDED && next == PaymentStatus.PROCESSING) {
            log.debug("Ignoring a late {} for already-captured payment {}", type, payment.getId());
            return;
        }

        payment.setStatus(next);
        if (next == PaymentStatus.FAILED) {
            payment.setFailureReason(errorIn(root));
        }
        paymentRepository.save(payment);

        // The rider who pays and closes the app never makes the confirmation call, so this is the
        // only thing that confirms their seat. Idempotent on the booking, because the same capture
        // arrives here and from the app.
        if (next == PaymentStatus.SUCCEEDED && payment.getShuttleBookingId() != null) {
            shuttleBookingRepository.findById(payment.getShuttleBookingId())
                    .ifPresent(shuttleService::confirmBooking);
        }
        log.info("Payment {} is now {} after {}", payment.getId(), next, type);
    }

    private void record(String eventId, String type, String paymentId, String payload) {
        PaymentEvent event = new PaymentEvent();
        event.setProvider(PROVIDER);
        event.setProviderEventId(eventId);
        event.setEventType(type);
        event.setPaymentId(paymentId);
        event.setPayload(payload);
        paymentEventRepository.save(event);
    }

    /** Razorpay nests the entity under payload.<kind>.entity - payment for one, refund for another. */
    private static String paymentIdIn(JsonNode root) {
        JsonNode payment = root.path("payload").path("payment").path("entity").path("id");
        if (!payment.isMissingNode()) {
            return payment.asText(null);
        }
        // A refund event names the payment it refunds, which is the row we hold.
        JsonNode refund = root.path("payload").path("refund").path("entity").path("payment_id");
        return refund.isMissingNode() ? null : refund.asText(null);
    }

    private static String errorIn(JsonNode root) {
        JsonNode entity = root.path("payload").path("payment").path("entity");
        String description = entity.path("error_description").asText(null);
        return description == null ? entity.path("error_code").asText(null) : description;
    }
}

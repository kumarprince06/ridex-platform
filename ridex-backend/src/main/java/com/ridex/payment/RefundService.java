package com.ridex.payment;

import java.time.Instant;
import java.util.Currency;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.notification.Notifier;
import com.ridex.payment.domain.Payment;
import com.ridex.payment.domain.PaymentStatus;
import com.ridex.payment.domain.Refund;
import com.ridex.points.PointsService;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shared.money.Money;

import lombok.RequiredArgsConstructor;

/**
 * Refunds, paid as points. Never more in total than the payment took, and each one recorded, so
 * "why does this rider have 5,000 extra points" is answered by a row with a reason and a name.
 */
@Service
@RequiredArgsConstructor
public class RefundService {

    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final PointsService pointsService;
    private final Notifier notifier;

    @Transactional
    public Refund refundAsPoints(String paymentId, long amountMinor, String reason, String issuedBy) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new NotFoundException("No such payment."));
        if (payment.getStatus() != PaymentStatus.SUCCEEDED && payment.getStatus() != PaymentStatus.PARTIALLY_REFUNDED) {
            throw new ConflictException("Only a payment that went through can be refunded.");
        }
        long left = payment.getNetAmountMinor() - refundRepository.refundedOn(paymentId);
        if (amountMinor > left) {
            throw new ValidationException("At most %s is left to refund on this payment."
                    .formatted(Money.of(left, Currency.getInstance(payment.getCurrency()))));
        }

        Refund refund = new Refund();
        refund.setPaymentId(paymentId);
        refund.setAmountMinor(amountMinor);
        refund.setCurrency(payment.getCurrency());
        refund.setReason(reason.trim());
        refund.setStatus("COMPLETED");
        refund.setIdempotencyKey("points-refund:" + paymentId + ":" + refundRepository.findByPaymentIdOrderByCreatedAtDesc(paymentId).size());
        refund.setIssuedByUserId(issuedBy);
        refund.setCompletedAt(Instant.now());
        refundRepository.save(refund);

        String riderUserId = payment.getRider().getUser().getId();
        pointsService.creditRefund(riderUserId, amountMinor, refund.getId(), reason.trim());
        payment.setStatus(amountMinor == left ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED);
        paymentRepository.save(payment);

        notifier.notifyUser(riderUserId, "REFUNDED_AS_POINTS",
                Money.of(amountMinor, Currency.getInstance(payment.getCurrency())) + "|" + reason.trim(),
                "PAYMENT", paymentId);
        return refund;
    }
}

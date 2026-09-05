package com.ridex.payment;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.payment.domain.Payment;
import com.ridex.shared.exception.ConflictException;

import lombok.RequiredArgsConstructor;

/**
 * The one place that decides whether a rider owes money.
 *
 * <p>Booking anything - a ride or a shuttle seat - goes through here first. Asked in one place
 * because the rule is one rule: a rider who walked away from a fare cannot start another journey
 * until they have paid for the last one. Two copies of that check would eventually disagree, and
 * the one that was forgotten is the free ride.
 *
 * <p>Cash is never outstanding. The driver was handed the money in the car, so those payments are
 * settled the moment they are recorded - this only ever catches an online checkout that was
 * abandoned, declined, or closed before it confirmed.
 */
@Component
@RequiredArgsConstructor
public class OutstandingPayments {

    private final PaymentRepository paymentRepository;

    /**
     * @throws ConflictException naming the amount, because "you have an unpaid ride" with no figure
     *                           is a dead end - the rider cannot tell which one or how much.
     */
    @Transactional(readOnly = true)
    public void requireNoneFor(String riderProfileId) {
        List<Payment> owed = paymentRepository.findOutstanding(riderProfileId);
        if (owed.isEmpty()) {
            return;
        }

        long total = owed.stream().mapToLong(Payment::getNetAmountMinor).sum();
        String currency = owed.get(0).getCurrency();

        throw new ConflictException(
                "You have %d unpaid %s totalling %s %s. Please settle it before booking again."
                        .formatted(
                                owed.size(),
                                owed.size() == 1 ? "fare" : "fares",
                                currency,
                                BigDecimal.valueOf(total, 2).toPlainString()));
    }
}

package com.ridex.payment;

import java.time.Instant;
import java.util.Currency;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.payment.domain.DriverEarning;
import com.ridex.payment.domain.DriverPayout;
import com.ridex.payment.domain.LedgerAccountType;
import com.ridex.payment.domain.PayoutStatus;
import com.ridex.payment.dto.PayoutResponse;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.money.Money;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Turns earned-but-unpaid trips into one payout, and records it moving.
 *
 * <p>Nothing here talks to a bank. A payout is created, then marked processing, paid or failed by
 * whoever actually made the transfer - which today is a person with a bank app. The states exist
 * so that when a provider is wired, it has somewhere to report to.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PayoutService {

    private final DriverPayoutRepository driverPayoutRepository;
    private final DriverEarningRepository driverEarningRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final LedgerService ledger;

    @Transactional(readOnly = true)
    public List<PayoutResponse> mine(String driverUserId) {
        String driverId = driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."))
                .getId();

        return driverPayoutRepository.findByDriverIdOrderByCreatedAtDesc(driverId)
                .stream().map(PayoutResponse::of).toList();
    }

    /**
     * Batches everything this driver is owed into one payout.
     *
     * <p>The claim on each earning row is what makes this safe to run twice: the second run finds
     * nothing unsettled and creates nothing. A counter would let a double click pay a trip twice.
     */
    @Transactional
    public PayoutResponse createFor(String driverId) {
        DriverProfile driver = driverProfileRepository.findById(driverId)
                .orElseThrow(() -> new NotFoundException("No such driver."));

        List<DriverEarning> unsettled =
                driverEarningRepository.findByDriverIdAndPayoutIdIsNullOrderByCreatedAtAsc(driverId);

        if (unsettled.isEmpty()) {
            throw new ConflictException("That driver has nothing owed.");
        }

        long total = unsettled.stream().mapToLong(DriverEarning::getNetAmountMinor).sum();
        if (total <= 0) {
            // Possible once refunds and adjustments land as negative lines. Not a transfer.
            throw new ConflictException("That driver's balance is not positive.");
        }

        // Currency comes from the rows, never a constant: a driver paid in one currency must not
        // have their payout labelled with the platform's default.
        String currency = unsettled.get(0).getCurrency();

        DriverPayout payout = new DriverPayout();
        payout.setDriver(driver);
        payout.setCurrency(currency);
        payout.setAmountMinor(total);
        payout.setPeriodStart(unsettled.get(0).getCreatedAt());
        payout.setPeriodEnd(unsettled.get(unsettled.size() - 1).getCreatedAt());
        driverPayoutRepository.save(payout);

        unsettled.forEach(earning -> earning.setPayoutId(payout.getId()));
        driverEarningRepository.saveAll(unsettled);

        return PayoutResponse.of(payout);
    }

    /** One payout per driver with money owed. Returns what it created, not what it skipped. */
    @Transactional
    public List<PayoutResponse> runBatch() {
        return driverEarningRepository.driverIdsWithUnsettledEarnings().stream()
                .map(driverId -> {
                    try {
                        return createFor(driverId);
                    } catch (ConflictException skipped) {
                        // A driver whose balance nets to zero is not a failure of the run.
                        log.debug("Skipped payout for {}: {}", driverId, skipped.getMessage());
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @Transactional
    public PayoutResponse markProcessing(String payoutId) {
        DriverPayout payout = require(payoutId);
        if (payout.getStatus() != PayoutStatus.PENDING) {
            throw new ConflictException("Only a pending payout can be sent.");
        }
        payout.setStatus(PayoutStatus.PROCESSING);
        return PayoutResponse.of(driverPayoutRepository.save(payout));
    }

    /**
     * The money actually left. This is the only place the driver's ledger balance goes down.
     *
     * <p>Debited on confirmation rather than on batching: a payout sitting in PENDING has not left
     * the platform, and showing the driver a zero balance for money still in the platform's account
     * is the wrong lie to tell.
     */
    @Transactional
    public PayoutResponse markPaid(String payoutId, String reference) {
        DriverPayout payout = require(payoutId);
        if (payout.getStatus().isTerminal()) {
            throw new ConflictException("That payout is already settled.");
        }

        payout.setStatus(PayoutStatus.PAID);
        payout.setReference(reference);
        payout.setSettledAt(Instant.now());
        driverPayoutRepository.save(payout);

        ledger.debit(
                LedgerAccountType.DRIVER,
                payout.getDriver().getId(),
                new Money(payout.getAmountMinor(), Currency.getInstance(payout.getCurrency())),
                "PAYOUT",
                "DRIVER_PAYOUT",
                payout.getId(),
                // The payout id is the idempotency key, so a retried confirmation cannot post the
                // debit twice.
                "payout:" + payout.getId());

        return PayoutResponse.of(payout);
    }

    /**
     * The transfer bounced. Releasing the earnings is the whole point: they go back to unsettled so
     * the next batch picks them up, rather than being stranded in a payout nobody will retry.
     */
    @Transactional
    public PayoutResponse markFailed(String payoutId, String reason) {
        DriverPayout payout = require(payoutId);
        if (payout.getStatus() == PayoutStatus.PAID) {
            throw new ConflictException("That payout was already paid.");
        }

        payout.setStatus(PayoutStatus.FAILED);
        payout.setFailureReason(reason);
        payout.setSettledAt(Instant.now());
        driverPayoutRepository.save(payout);

        List<DriverEarning> released = driverEarningRepository.findByPayoutIdOrderByCreatedAtAsc(payoutId);
        released.forEach(earning -> earning.setPayoutId(null));
        driverEarningRepository.saveAll(released);

        return PayoutResponse.of(payout);
    }

    @Transactional(readOnly = true)
    public Page<PayoutResponse> list(PayoutStatus status, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        return (status == null
                ? driverPayoutRepository.findAllByOrderByCreatedAtDesc(pageable)
                : driverPayoutRepository.findByStatusOrderByCreatedAtDesc(status, pageable))
                .map(PayoutResponse::of);
    }

    private DriverPayout require(String payoutId) {
        return driverPayoutRepository.findById(payoutId)
                .orElseThrow(() -> new NotFoundException("No such payout."));
    }
}

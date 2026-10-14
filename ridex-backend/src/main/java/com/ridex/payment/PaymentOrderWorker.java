package com.ridex.payment;

import java.time.Duration;
import java.time.Instant;
import java.util.Currency;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.ridex.payment.domain.Payment;
import com.ridex.payment.domain.PaymentStatus;
import com.ridex.shared.exception.ProviderUnavailableException;
import com.ridex.shared.money.Money;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;

/**
 * Opens the gateway order for an online trip payment, outside the transaction that completed it.
 *
 * <p>The payment row is the outbox: settleTrip writes it CREATED in the trip's own transaction, and
 * this opens the order once that has committed - straight away, and again from the poll if the
 * gateway was down. A gateway call inside the completion meant a Razorpay blip undid the trip.
 *
 * <p>At least once, not exactly once: a node can die after the gateway answers and before the commit.
 * The retry sends the same idempotency key, and an order nobody pays moves no money - checkout and
 * confirmForRider only ever settle the one order id stored here.
 */
@Slf4j
@Component
public class PaymentOrderWorker {

    static final short MAX_ATTEMPTS = 8;

    private final PaymentRepository paymentRepository;
    private final PaymentProviders providers;
    private final TransactionTemplate perPayment;

    // Off in tests, like the outbox: a poll firing mid-test races whatever the test is asserting.
    @Value("${app.payments.dispatch-enabled:true}")
    private boolean enabled;

    @Value("${app.payments.dispatch-batch:20}")
    private int batchSize;

    public PaymentOrderWorker(PaymentRepository paymentRepository, PaymentProviders providers,
            PlatformTransactionManager transactionManager, MeterRegistry meterRegistry) {
        this.paymentRepository = paymentRepository;
        this.providers = providers;
        // REQUIRES_NEW: one payment per transaction, and a real one even when called from afterCommit,
        // where joining the finished transaction would silently discard every write.
        this.perPayment = new TransactionTemplate(transactionManager);
        this.perPayment.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        // Read when metrics are published, not on every drain. A queue that only grows means the
        // gateway is down or the worker is not running.
        Gauge.builder("ridex.payments.orders.pending", this, PaymentOrderWorker::pendingOrders)
                .description("Online trip payments still waiting for their gateway order")
                .register(meterRegistry);
    }

    @Scheduled(fixedDelayString = "${app.payments.dispatch-ms:2000}")
    public void scheduledDrain() {
        if (enabled) {
            drain();
        }
    }

    /** Opens every due order, up to one batch. Returns how many payments it handled. */
    public int drain() {
        int handled = 0;
        while (handled < batchSize && handle(() -> paymentRepository.claimNextDue(Instant.now()))) {
            handled++;
        }
        return handled;
    }

    /**
     * Opens this payment's order as soon as the caller's transaction commits.
     *
     * <p>The happy path, so the rider's checkout has an order the moment the trip ends rather than
     * one poll later. Never throws: the trip is already committed, and a failure here is only a
     * retry the poll will make.
     */
    public void openAfterCommit(String paymentId) {
        Runnable open = () -> handle(() -> paymentRepository.claimIfDue(paymentId));
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            open.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                open.run();
            }
        });
    }

    /** One claim, one gateway call, one commit. Returns whether a payment was claimed. */
    private boolean handle(Supplier<Optional<Payment>> claim) {
        AtomicReference<String> claimedId = new AtomicReference<>();
        try {
            return Boolean.TRUE.equals(perPayment.execute(status -> claim.get()
                    .map(payment -> {
                        claimedId.set(payment.getId());
                        openOrder(payment);
                        return true;
                    })
                    .orElse(false)));
        } catch (RuntimeException ex) {
            if (claimedId.get() == null) {
                // Not even a claim: the database is the problem, and the next poll asks again.
                log.error("Could not claim a payment to open its gateway order", ex);
                return false;
            }
            // Gateway called, commit failed. Pushed back, or the same row heads the queue every poll.
            log.error("Payment {} could not be saved after its gateway call", claimedId.get(), ex);
            deferAfterCrash(claimedId.get(), ex);
            return true;
        }
    }

    private void openOrder(Payment payment) {
        try {
            var intent = providers.forMethod(payment.getMethod()).createPaymentIntent(
                    Money.of(payment.getNetAmountMinor(), Currency.getInstance(payment.getCurrency())),
                    payment.getTrip().getId(),
                    payment.getIdempotencyKey());

            payment.setProviderPaymentId(intent.providerPaymentId());
            payment.setStatus("SUCCEEDED".equals(intent.status())
                    ? PaymentStatus.SUCCEEDED : PaymentStatus.PROCESSING);
            if (payment.getStatus() == PaymentStatus.SUCCEEDED) {
                payment.setPaidAt(Instant.now());
            }
            payment.setNextAttemptAt(null);
            payment.setLastError(null);
            log.info("Opened gateway order {} for payment {} on attempt {}",
                    intent.providerPaymentId(), payment.getId(), payment.getAttempts() + 1);
        } catch (ProviderUnavailableException ex) {
            recordFailure(payment, ex, true);
        } catch (RuntimeException ex) {
            // Not a blip: no gateway configured, or a payment the code cannot send. Retrying
            // would fail the same way eight times.
            recordFailure(payment, ex, false);
        }
    }

    private void recordFailure(Payment payment, RuntimeException ex, boolean retryable) {
        short attempts = (short) (payment.getAttempts() + 1);
        String error = describe(ex);
        payment.setAttempts(attempts);
        payment.setLastError(truncate(error, 500));

        if (retryable && attempts < MAX_ATTEMPTS) {
            Duration delay = backoff(attempts);
            payment.setNextAttemptAt(Instant.now().plus(delay));
            log.warn("Payment {} order not opened (attempt {}/{}), retrying in {}s: {}",
                    payment.getId(), attempts, MAX_ATTEMPTS, delay.toSeconds(), error);
            return;
        }

        // Kept as FAILED, not deleted: it is a fare the rider owes, and findOutstanding shows it.
        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason(truncate(error, 255));
        payment.setNextAttemptAt(null);
        log.error("Payment {} failed after {} attempt(s): its gateway order could not be opened",
                payment.getId(), attempts, ex);
    }

    private void deferAfterCrash(String paymentId, RuntimeException cause) {
        try {
            perPayment.executeWithoutResult(status -> paymentRepository.claimIfDue(paymentId)
                    .ifPresent(payment -> recordFailure(payment, cause, true)));
        } catch (RuntimeException ex) {
            log.error("Payment {} could not be deferred either; the next poll retries it", paymentId, ex);
        }
    }

    // NaN rather than a throw: a database blip must not break every other metric in the publish.
    private double pendingOrders() {
        try {
            return paymentRepository.countByStatusAndNextAttemptAtIsNotNull(PaymentStatus.CREATED);
        } catch (RuntimeException ex) {
            log.warn("Could not count pending payment orders: {}", ex.getMessage());
            return Double.NaN;
        }
    }

    // 2^n seconds plus up to half again at random, so every node does not retry a recovering
    // gateway in the same second.
    static Duration backoff(int attempts) {
        long baseMillis = (1L << attempts) * 1000;
        return Duration.ofMillis(baseMillis + ThreadLocalRandom.current().nextLong(baseMillis / 2 + 1));
    }

    private static String describe(RuntimeException ex) {
        return ex.getMessage() == null ? ex.toString() : ex.getMessage();
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }
}

package com.ridex.wallet;

import java.time.Instant;
import java.util.Currency;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.driver.DriverProfileRepository;
import com.ridex.payment.LedgerService;
import com.ridex.payment.PaymentProvider;
import com.ridex.payment.PaymentProviders;
import com.ridex.payment.domain.LedgerAccountType;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.platform.settings.SettingsService;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shared.money.Money;
import com.ridex.shared.util.UlidGenerator;
import com.ridex.wallet.dto.TopUpCheckout;
import com.ridex.wallet.dto.WalletResponse;

import lombok.RequiredArgsConstructor;

/**
 * The driver wallet: the driver ledger balance, read as what the driver owes or is owed.
 *
 * <p>No separate balance column - a second number would drift from the ledger it restates. Cash
 * rides debit the platform's fee, penalties debit, top-ups and fee shares credit.
 */
@Service
@RequiredArgsConstructor
public class DriverWalletService {

    // ponytail: single-currency platform, as every other INR default here. Per-zone currency is
    // a column on the driver when a second market opens.
    static final Currency CURRENCY = Currency.getInstance("INR");

    private final LedgerService ledger;
    private final SettingsService settings;
    private final DriverProfileRepository driverProfileRepository;
    private final DriverWalletTopUpRepository topUps;
    private final PaymentProviders providers;

    @Value("${app.razorpay.key-id:}")
    private String razorpayKeyId;

    @Transactional(readOnly = true)
    public WalletResponse walletFor(String driverUserId) {
        return wallet(requireDriverId(driverUserId));
    }

    /** Null while the wallet allows offers; otherwise what to tell the driver. */
    @Transactional(readOnly = true)
    public String blockedReason(String driverId) {
        WalletResponse wallet = wallet(driverId);
        return wallet.blocked()
                ? "You owe RideX " + rupees(wallet.dueMinor()) + " in platform fees. Pay it from your wallet to get rides."
                : null;
    }

    /**
     * Opens checkout for everything owed, so a paid wallet lands back at zero. The same
     * idempotency key always returns the same checkout - a double tap is one gateway order.
     */
    @Transactional
    public TopUpCheckout startTopUp(String driverUserId, String idempotencyKey) {
        String driverId = requireDriverId(driverUserId);
        if (idempotencyKey != null) {
            var repeat = topUps.findByDriverIdAndIdempotencyKey(driverId, idempotencyKey);
            if (repeat.isPresent()) {
                return checkoutOf(repeat.get());
            }
        }
        long due = wallet(driverId).dueMinor();
        if (due == 0) {
            throw new ConflictException("You do not owe anything right now.");
        }

        // A driver who backed out of checkout reopens the same order rather than stacking new ones.
        DriverWalletTopUp topUp = topUps
                .findFirstByDriverIdAndStatusAndAmountMinorOrderByCreatedAtDesc(driverId, "CREATED", due)
                .orElse(null);
        if (topUp == null) {
            PaymentProvider gateway = providers.forMethod(PaymentMethod.UPI);
            topUp = new DriverWalletTopUp();
            topUp.setId(UlidGenerator.generateUlid());
            topUp.setDriverId(driverId);
            topUp.setCurrency(CURRENCY.getCurrencyCode());
            topUp.setAmountMinor(due);
            topUp.setProvider(gateway.name());
            topUp.setIdempotencyKey(idempotencyKey);
            topUp.setProviderOrderId(gateway.createPaymentIntent(
                    Money.of(due, CURRENCY), "wallet:" + driverId, "topup:" + topUp.getId()).providerPaymentId());
            // Flushed now, so two racing requests with one key meet uk_driver_wallet_topups_idempotency
            // here - the loser fails instead of both opening orders.
            topUps.saveAndFlush(topUp);
        }
        return checkoutOf(topUp);
    }

    private TopUpCheckout checkoutOf(DriverWalletTopUp topUp) {
        return new TopUpCheckout(topUp.getId(), topUp.getProviderOrderId(), razorpayKeyId,
                topUp.getAmountMinor(), topUp.getCurrency());
    }

    /**
     * Credits the wallet once the gateway - not the app - says the money arrived, for this order
     * and this amount. Checked because a captured payment id is otherwise replayable.
     */
    @Transactional
    public WalletResponse confirmTopUp(String driverUserId, String topUpId, String gatewayPaymentId) {
        String driverId = requireDriverId(driverUserId);
        DriverWalletTopUp topUp = topUps.findByIdAndDriverId(topUpId, driverId)
                .orElseThrow(() -> new NotFoundException("No such top-up."));
        if ("SUCCEEDED".equals(topUp.getStatus())) {
            return wallet(driverId);
        }
        if (topUps.existsByProviderPaymentId(gatewayPaymentId)) {
            throw new ConflictException("That payment has already been credited.");
        }

        var confirmed = providers.forMethod(PaymentMethod.UPI).confirmPayment(gatewayPaymentId);
        switch (confirmed.status()) {
            case "SUCCEEDED" -> {
                if (confirmed.orderId() == null
                        || !confirmed.isFor(topUp.getProviderOrderId(), topUp.getAmountMinor())) {
                    throw new ValidationException("That payment is not for this top-up.");
                }
                credit(topUp, gatewayPaymentId);
            }
            case "FAILED" -> {
                topUp.setStatus("FAILED");
                topUp.setFailureReason(confirmed.failureReason());
            }
            default -> topUp.setStatus("PROCESSING");
        }
        topUps.save(topUp);
        return wallet(driverId);
    }

    /**
     * The webhook's route to the same credit, for a driver whose app never sent the confirm call.
     * The ledger key is the same, so a webhook and a confirm racing each other credit once.
     */
    @Transactional
    public void settleFromWebhook(String orderId, String gatewayPaymentId, long amountMinor) {
        topUps.findByProviderOrderId(orderId)
                .filter(topUp -> !"SUCCEEDED".equals(topUp.getStatus()))
                .filter(topUp -> topUp.getAmountMinor() == amountMinor)
                .ifPresent(topUp -> {
                    credit(topUp, gatewayPaymentId);
                    topUps.save(topUp);
                });
    }

    private void credit(DriverWalletTopUp topUp, String gatewayPaymentId) {
        topUp.setStatus("SUCCEEDED");
        topUp.setProviderPaymentId(gatewayPaymentId);
        topUp.setPaidAt(Instant.now());
        ledger.credit(LedgerAccountType.DRIVER, topUp.getDriverId(), Money.of(topUp.getAmountMinor(), CURRENCY),
                "WALLET_TOPUP", "WALLET_TOPUP", topUp.getId(), "wallet-topup:" + topUp.getId());
    }

    private WalletResponse wallet(String driverId) {
        long balance = ledger.balanceOf(LedgerAccountType.DRIVER, driverId, CURRENCY).amountMinor();
        long limit = settings.getInt("driver.wallet.min-balance", -50) * 100L;
        return new WalletResponse(CURRENCY.getCurrencyCode(), balance, limit, Math.max(0, -balance), balance < limit);
    }

    private String requireDriverId(String driverUserId) {
        return driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."))
                .getId();
    }

    private static String rupees(long minor) {
        return String.format("Rs %.2f", minor / 100.0);
    }
}

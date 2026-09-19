package com.ridex.payment;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.payment.domain.LedgerAccountType;
import com.ridex.platform.settings.SettingsService;
import com.ridex.shared.money.Money;

import lombok.RequiredArgsConstructor;

/**
 * What a cancellation moves between the driver's wallet and the platform. Keyed by ride, so a
 * retried cancel posts nothing twice.
 */
@Service
@RequiredArgsConstructor
public class CancellationSettlement {

    private final LedgerService ledger;
    private final SettingsService settings;

    /**
     * The driver's part of a rider's late-cancel or no-show fee. Credited now, although the rider
     * pays with their next fare: the driver already spent the fuel, so the platform fronts it.
     */
    @Transactional
    public void shareWithDriver(String driverId, Money riderFee, String rideId) {
        Money share = riderFee.times(settings.getDecimal("cancellation.driver-share", new BigDecimal("0.80")));
        ledger.credit(LedgerAccountType.DRIVER, driverId, share,
                "CANCELLATION_COMPENSATION", "RIDE", rideId, "cancel-share:" + rideId);
        ledger.debit(LedgerAccountType.PLATFORM, null, share,
                "CANCELLATION_COMPENSATION", "RIDE", rideId, "cancel-share-platform:" + rideId);
    }

    @Transactional
    public void penaliseDriver(String driverId, Money penalty, String rideId) {
        ledger.debit(LedgerAccountType.DRIVER, driverId, penalty,
                "CANCELLATION_PENALTY", "RIDE", rideId, "cancel-penalty:" + rideId);
        ledger.credit(LedgerAccountType.PLATFORM, null, penalty,
                "CANCELLATION_PENALTY", "RIDE", rideId, "cancel-penalty-platform:" + rideId);
    }
}

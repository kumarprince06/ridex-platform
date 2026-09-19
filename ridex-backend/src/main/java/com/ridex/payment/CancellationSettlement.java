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
        shareWithDriver(driverId, riderFee, "RIDE", rideId);
    }

    /**
     * The same split for anything a rider forfeits - a ride fee, or the part of a cancelled shuttle
     * seat that did not come back as points. The platform keeps the rest.
     */
    @Transactional
    public void shareWithDriver(String driverId, Money forfeited, String referenceType, String referenceId) {
        Money share = forfeited.times(settings.getDecimal("cancellation.driver-share", new BigDecimal("0.80")));
        ledger.credit(LedgerAccountType.DRIVER, driverId, share,
                "CANCELLATION_COMPENSATION", referenceType, referenceId, "cancel-share:" + referenceId);
        ledger.debit(LedgerAccountType.PLATFORM, null, share,
                "CANCELLATION_COMPENSATION", referenceType, referenceId, "cancel-share-platform:" + referenceId);
    }

    @Transactional
    public void penaliseDriver(String driverId, Money penalty, String rideId) {
        ledger.debit(LedgerAccountType.DRIVER, driverId, penalty,
                "CANCELLATION_PENALTY", "RIDE", rideId, "cancel-penalty:" + rideId);
        ledger.credit(LedgerAccountType.PLATFORM, null, penalty,
                "CANCELLATION_PENALTY", "RIDE", rideId, "cancel-penalty-platform:" + rideId);
    }
}

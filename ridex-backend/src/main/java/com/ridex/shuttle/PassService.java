package com.ridex.shuttle;

import java.time.LocalDate;
import java.util.Currency;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.payment.ShuttlePaymentService;
import com.ridex.payment.domain.PaymentMethod;
import com.ridex.payment.domain.PaymentStatus;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.shared.money.Money;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shuttle.domain.Pass;
import com.ridex.shuttle.domain.PassProduct;
import com.ridex.shuttle.dto.PassResponse;

import lombok.RequiredArgsConstructor;

/**
 * Commuter passes.
 *
 * <p>The one product here that changes the business rather than the experience: a marketplace has
 * no switching cost, and somebody who has paid for next month's commute does.
 */
@Service
@RequiredArgsConstructor
public class PassService {

    private final PassRepository passRepository;
    private final PassProductRepository passProductRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final com.ridex.payment.ShuttlePaymentService shuttlePayments;
    private final com.ridex.points.PointsService pointsService;

    @Transactional(readOnly = true)
    public List<PassProduct> productsFor(String routeId) {
        return passProductRepository.findByRouteIdAndActiveTrueOrderByPriceMinorAsc(routeId);
    }

    /**
     * Buys a pass.
     *
     * <p>Prepaid: the pass is written PENDING_PAYMENT and covers nothing until the gateway says
     * the money cleared. Points may pay part of it, capped by the price, exactly as on a seat.
     */
    @Transactional
    public PassResponse buy(String riderUserId, String productId, LocalDate startsOn,
            PaymentMethod method, Integer redeemPoints) {
        RiderProfile rider = riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."));

        PassProduct product = passProductRepository.findById(productId)
                .filter(PassProduct::isActive)
                .orElseThrow(() -> new NotFoundException("That pass is not on sale."));

        LocalDate start = startsOn == null ? LocalDate.now() : startsOn;
        if (start.isBefore(LocalDate.now())) {
            throw new ConflictException("A pass cannot start in the past.");
        }

        LocalDate end = start.plusDays(product.getDurationDays() - 1L);

        // Overlapping passes on one route would be money spent twice for the same days.
        boolean overlaps = passRepository
                .findByRiderIdOrderByEndsOnDesc(rider.getId()).stream()
                .filter(existing -> "ACTIVE".equals(existing.getStatus()))
                .filter(existing -> existing.getRouteId().equals(product.getRoute().getId()))
                .anyMatch(existing -> !existing.getEndsOn().isBefore(start)
                        && !existing.getStartsOn().isAfter(end));
        if (overlaps) {
            throw new ConflictException("You already have a pass covering those dates on this route.");
        }

        Pass pass = new Pass();
        pass.setProduct(product);
        pass.setRider(rider);
        pass.setRouteId(product.getRoute().getId());
        pass.setStartsOn(start);
        pass.setEndsOn(end);
        pass.setRideLimit(product.getRideLimit());
        pass.setCurrency(product.getCurrency());
        pass.setPricePaidMinor(product.getPriceMinor());
        passRepository.save(pass);

        // Spent now, so the same points cannot pay for two passes at once. The redeem call caps
        // them at what this price can absorb.
        int spent = redeemPoints == null || redeemPoints <= 0
                ? 0
                : pointsService.redeemOnSeat(riderUserId, redeemPoints,
                        product.getPriceMinor(), pass.getId());
        pass.setRedeemedPoints(spent);
        pass.setDiscountMinor(pointsService.valueOf(spent));
        passRepository.save(pass);

        Currency currency = Currency.getInstance(product.getCurrency());
        var checkout = shuttlePayments.startPassPayment(
                pass.getId(),
                rider,
                Money.of(product.getPriceMinor(), currency),
                Money.of(pass.getDiscountMinor(), currency),
                method);

        return toResponse(pass, checkout);
    }

    @Transactional(readOnly = true)
    public List<PassResponse> mine(String riderUserId) {
        return riderProfileRepository.findByUserId(riderUserId)
                .map(rider -> passRepository.findByRiderIdOrderByEndsOnDesc(rider.getId()).stream()
                        .map(this::toResponse)
                        .toList())
                .orElse(List.of());
    }

    /**
     * Confirms the purchase against the gateway, and only then makes the pass usable.
     *
     * <p>The gateway is asked rather than the app believed - the same rule as a seat and a trip.
     */
    @Transactional
    public PassResponse confirmPayment(String riderUserId, String passId, String gatewayPaymentId) {
        RiderProfile rider = riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."));

        Pass pass = passRepository.findById(passId)
                .filter(candidate -> candidate.getRider().getId().equals(rider.getId()))
                .orElseThrow(() -> new NotFoundException("No such pass."));

        var status = shuttlePayments.confirmPassPayment(passId, gatewayPaymentId);
        if (status == PaymentStatus.SUCCEEDED) {
            pass.setStatus("ACTIVE");
            passRepository.save(pass);
        }

        return toResponse(pass, null);
    }

    private PassResponse toResponse(Pass pass) {
        return toResponse(pass, null);
    }

    private PassResponse toResponse(Pass pass, ShuttlePaymentService.ShuttleCheckout fresh) {
        return new PassResponse(
                pass.getId(),
                pass.getProduct().getName(),
                pass.getProduct().getRoute().getName(),
                pass.getStartsOn(),
                pass.getEndsOn(),
                pass.getRideLimit(),
                pass.getRidesUsed(),
                pass.getCurrency(),
                pass.getPricePaidMinor(),
                pass.getRedeemedPoints(),
                pass.getDiscountMinor(),
                pass.getStatus(),
                checkoutFor(pass, fresh));
    }

    /**
     * The open checkout for a pass that has not been paid for.
     *
     * <p>Carried on every unpaid pass, not just the one just bought: a rider who backed out of the
     * gateway reopens it from their passes, and without the order id there is nothing to pay with.
     */
    private PassResponse.Checkout checkoutFor(Pass pass, ShuttlePaymentService.ShuttleCheckout fresh) {
        var checkout = fresh != null ? fresh : shuttlePayments.passCheckoutFor(pass.getId());
        return checkout == null ? null : new PassResponse.Checkout(
                checkout.gatewayOrderId(), checkout.gatewayKeyId(), checkout.amountMinor(),
                checkout.currency(), checkout.status());
    }
}

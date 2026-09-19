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
import com.ridex.shuttle.domain.PassPlan;
import com.ridex.shuttle.domain.PassProduct;
import com.ridex.shuttle.domain.Route;
import com.ridex.shuttle.dto.PassPricingRequest;
import com.ridex.shuttle.dto.PassPricingResponse;
import com.ridex.shuttle.dto.PassProductResponse;
import com.ridex.shuttle.dto.PassResponse;

import lombok.RequiredArgsConstructor;
import com.ridex.admin.dto.PageResponse;
import com.ridex.points.PointsService;
import com.ridex.shuttle.dto.AdminPassResponse;
import com.ridex.shuttle.dto.RoutePassSummary;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import org.springframework.data.domain.PageRequest;

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
    private final RouteRepository routeRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final ShuttlePaymentService shuttlePayments;
    private final PointsService pointsService;

    /** What a rider can buy on a route, shortest first, each priced against the monthly pass. */
    @Transactional(readOnly = true)
    public List<PassProductResponse> productsFor(String routeId) {
        List<PassProduct> onSale = passProductRepository.findByRouteIdAndActiveTrueOrderByPriceMinorAsc(routeId);
        boolean soldOut = !onSale.isEmpty() && soldOut(onSale.get(0).getRoute());
        Long monthly = onSale.stream()
                .filter(product -> product.getDurationDays() == PassPlan.MONTHLY.days())
                .map(PassProduct::getPriceMinor)
                .findFirst().orElse(null);
        return onSale.stream()
                .map(product -> {
                    int months = PassPlan.ofDays(product.getDurationDays()).map(PassPlan::months)
                            .orElse(Math.max(1, Math.round(product.getDurationDays() / 30f)));
                    return new PassProductResponse(product.getId(), product.getName(), product.getDescription(),
                            product.getDurationDays(), product.getRideLimit(), product.getCurrency(),
                            product.getPriceMinor(), months, product.getPriceMinor() / months,
                            monthly == null ? 0 : discountPercent(product.getPriceMinor(), monthly, months), soldOut);
                })
                .toList();
    }

    /** Every route with where its passes stand, for the Shuttle → Passes overview. */
    @Transactional(readOnly = true)
    public List<RoutePassSummary> overview(List<Route> routes) {
        LocalDate today = LocalDate.now();
        return routes.stream().map(route -> {
            List<PassProduct> products = passProductRepository.findByRouteId(route.getId());
            PassProduct monthly = planOf(products, PassPlan.MONTHLY);
            long active = products.stream().mapToLong(product -> passRepository.countRunning(product.getId(), today)).sum();
            return new RoutePassSummary(route.getId(), route.getName(),
                    monthly != null && monthly.isActive(), monthly == null ? null : monthly.getPriceMinor(), active);
        }).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminPassResponse> sold(int page, int size) {
        var passes = passRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)));
        var routeNames = new HashMap<String, String>();
        return PageResponse.of(passes, pass -> {
            var user = pass.getRider().getUser();
            String routeName = routeNames.computeIfAbsent(pass.getRouteId(),
                    id -> pass.getProduct().getRoute().getName());
            return new AdminPassResponse(pass.getId(),
                    user.displayName().orElse(user.getEmail()), user.getEmail(), routeName,
                    pass.getProduct().getName(), pass.getStartsOn(), pass.getEndsOn(), pass.getRidesUsed(),
                    pass.getCurrency(), pass.getPricePaidMinor() - pass.getDiscountMinor(),
                    "ACTIVE".equals(pass.getStatus()) && pass.getEndsOn().isBefore(LocalDate.now()) ? "EXPIRED" : pass.getStatus(),
                    pass.getCreatedAt());
        });
    }

    /** A route's four plans as operations sees them, with how many riders hold each. */
    @Transactional(readOnly = true)
    public PassPricingResponse pricing(String routeId) {
        List<PassProduct> products = passProductRepository.findByRouteId(routeId);
        PassProduct monthly = planOf(products, PassPlan.MONTHLY);
        LocalDate today = LocalDate.now();
        List<PassPricingResponse.Plan> plans = Arrays.stream(PassPlan.values())
                .map(plan -> {
                    PassProduct product = planOf(products, plan);
                    return new PassPricingResponse.Plan(plan.name(), plan.label(), plan.months(), plan.days(),
                            product == null ? null : product.getPriceMinor(),
                            product == null || monthly == null ? 0
                                    : discountPercent(product.getPriceMinor(), monthly.getPriceMinor(), plan.months()),
                            product == null ? 0 : passRepository.countRunning(product.getId(), today));
                })
                .toList();
        Route route = products.isEmpty() ? null : products.get(0).getRoute();
        return new PassPricingResponse(monthly == null ? null : monthly.getPriceMinor(),
                monthly != null && monthly.isActive(),
                monthly == null || monthly.getRideLimit() == 0 ? null : (int) monthly.getRideLimit(),
                route == null ? null : route.getPassLimit(),
                passRepository.countRunningOnRoute(routeId, today), plans);
    }

    /**
     * Sets a route's pass prices from the monthly one and a discount per longer plan. Passes already
     * sold keep the price they were bought at; only new purchases see the change.
     */
    @Transactional
    public PassPricingResponse setPricing(Route route, PassPricingRequest request) {
        List<PassProduct> products = passProductRepository.findByRouteId(route.getId());
        Map<PassPlan, Integer> discounts = Map.of(
                PassPlan.MONTHLY, 0,
                PassPlan.QUARTERLY, request.quarterlyDiscountPercent(),
                PassPlan.HALF_YEARLY, request.halfYearlyDiscountPercent(),
                PassPlan.YEARLY, request.yearlyDiscountPercent());
        route.setPassLimit(request.maxActivePasses());
        routeRepository.save(route);
        for (PassPlan plan : PassPlan.values()) {
            PassProduct product = planOf(products, plan);
            if (product == null) {
                product = new PassProduct();
                product.setRoute(route);
                product.setDurationDays((short) plan.days());
                product.setCurrency("INR");
            }
            // A set number of rides, scaled by the months: a monthly pass of 26 is 78 for a quarter.
            product.setRideLimit((short) (request.ridesPerMonth() * plan.months()));
            product.setName(plan.label());
            product.setDescription("%d rides on %s over %d %s".formatted(request.ridesPerMonth() * plan.months(),
                    route.getName(), plan.months(), plan.months() == 1 ? "month" : "months"));
            // Whole rupees: "Rs 4,275.50" reads like a mistake on a price list.
            long full = request.monthlyPriceMinor() * plan.months();
            product.setPriceMinor(Math.round(full * (100 - discounts.get(plan)) / 100.0 / 100.0) * 100);
            product.setActive(request.onSale());
            passProductRepository.save(product);
        }
        return pricing(route.getId());
    }

    private boolean soldOut(Route route) {
        return route.getPassLimit() != null
                && passRepository.countRunningOnRoute(route.getId(), LocalDate.now()) >= route.getPassLimit();
    }

    private static PassProduct planOf(List<PassProduct> products, PassPlan plan) {
        return products.stream().filter(product -> product.getDurationDays() == plan.days()).findFirst().orElse(null);
    }

    private static int discountPercent(long priceMinor, long monthlyMinor, int months) {
        long full = monthlyMinor * months;
        return full <= 0 ? 0 : (int) Math.max(0, Math.round((full - priceMinor) * 100.0 / full));
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

        if (soldOut(product.getRoute())) {
            throw new ConflictException("Passes on this route are sold out right now. Seats can still be booked one at a time.");
        }

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
            activate(pass);
        }

        return toResponse(pass, null);
    }

    /** Called by the webhook too, for a rider who paid and closed the app before confirming. */
    @Transactional
    public void activatePaid(String passId) {
        passRepository.findById(passId).ifPresent(this::activate);
    }

    private void activate(Pass pass) {
        if ("PENDING_PAYMENT".equals(pass.getStatus())) {
            pass.setStatus("ACTIVE");
            passRepository.save(pass);
        }
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

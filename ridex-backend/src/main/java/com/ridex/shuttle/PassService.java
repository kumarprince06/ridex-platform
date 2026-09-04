package com.ridex.shuttle;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.rider.RiderProfileRepository;
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

    @Transactional(readOnly = true)
    public List<PassProduct> productsFor(String routeId) {
        return passProductRepository.findByRouteIdAndActiveTrueOrderByPriceMinorAsc(routeId);
    }

    /**
     * Buys a pass.
     *
     * <p>ponytail: the money is recorded on the pass and nothing is charged yet. Passes are prepaid
     * and belong in the payments flow, but the gateway is cash-only today - a card charge is the
     * same PaymentService call once a real provider exists.
     */
    @Transactional
    public PassResponse buy(String riderUserId, String productId, LocalDate startsOn) {
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

        return toResponse(pass);
    }

    @Transactional(readOnly = true)
    public List<PassResponse> mine(String riderUserId) {
        return riderProfileRepository.findByUserId(riderUserId)
                .map(rider -> passRepository.findByRiderIdOrderByEndsOnDesc(rider.getId()).stream()
                        .map(this::toResponse)
                        .toList())
                .orElse(List.of());
    }

    private PassResponse toResponse(Pass pass) {
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
                pass.getStatus());
    }
}

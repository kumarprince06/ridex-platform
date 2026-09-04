package com.ridex.pricing;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.maps.MapsProvider;
import com.ridex.maps.domain.RouteEstimate;
import com.ridex.pricing.domain.*;
import com.ridex.pricing.dto.EstimateOptionResponse;
import com.ridex.pricing.dto.EstimateRequest;
import com.ridex.pricing.dto.FareLineResponse;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.rider.domain.RiderProfile;

import com.ridex.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FareEstimateService {

    // Long enough to choose an option, short enough that traffic has not moved underneath it.
    private static final Duration QUOTE_VALIDITY = Duration.ofMinutes(5);

    private final RideTypeRepository rideTypeRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final FareEstimateRepository fareEstimateRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final MapsProvider mapsProvider;

    /**
     * Prices every active ride type for one route, so the rider chooses between real options
     * rather than being handed a single number.
     */
    @Transactional
    public List<EstimateOptionResponse> estimate(String riderUserId, EstimateRequest request) {
        RiderProfile rider = riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."));

        // One route lookup for all options: the distance does not change with the car, and the
        // maps provider bills per call.
        RouteEstimate route = mapsProvider.route(
                request.pickupLat(), request.pickupLng(),
                request.destinationLat(), request.destinationLng());

        Instant now = Instant.now();
        Instant expiresAt = now.plus(QUOTE_VALIDITY);

        List<EstimateOptionResponse> options = new ArrayList<>();
        for (RideType rideType : rideTypeRepository.findByActiveTrueOrderBySortOrderAsc()) {
            // A type with no rule in force is not priceable, so it is not offered. Better a
            // missing option than a guessed price.
            pricingRuleRepository.findInForce(rideType.getId(), now).ifPresent(rule -> {
                Fare fare = FareCalculator.calculate(
                        rule.toRates(), distanceMeters(route), (int) route.durationSeconds());
                options.add(persist(rider, rideType, request, route, fare, rule.getSurgeMultiplier(), expiresAt));
            });
        }

        return options;
    }

    // The provider reports metres as a double; nothing sub-metre matters for a fare.
    private static int distanceMeters(RouteEstimate route) {
        return (int) Math.round(route.distanceMeters());
    }

    private EstimateOptionResponse persist(RiderProfile rider, RideType rideType,
            EstimateRequest request, RouteEstimate route, Fare fare, BigDecimal surge,
            Instant expiresAt) {

        FareEstimate estimate = new FareEstimate();
        estimate.setRider(rider);
        estimate.setRideType(rideType);
        estimate.setPickupLat(BigDecimal.valueOf(request.pickupLat()));
        estimate.setPickupLng(BigDecimal.valueOf(request.pickupLng()));
        estimate.setDestinationLat(BigDecimal.valueOf(request.destinationLat()));
        estimate.setDestinationLng(BigDecimal.valueOf(request.destinationLng()));
        estimate.setDistanceMeters(distanceMeters(route));
        estimate.setDurationSeconds((int) route.durationSeconds());
        estimate.setCurrency(fare.total().currency().getCurrencyCode());
        estimate.setTotalMinor(fare.total().amountMinor());
        estimate.setSurgeMultiplier(surge);
        estimate.setExpiresAt(expiresAt);

        for (FareLine line : fare.lines()) {
            FareEstimateLine row = new FareEstimateLine();
            row.setLineType(line.type());
            row.setLabel(line.label());
            row.setAmountMinor(line.amount().amountMinor());
            row.setCurrency(line.amount().currency().getCurrencyCode());
            row.setSortOrder((short) line.sortOrder());
            estimate.addLine(row);
        }

        fareEstimateRepository.save(estimate);

        return new EstimateOptionResponse(
                estimate.getId(),
                rideType.getCode(),
                rideType.getDisplayName(),
                rideType.getDescription(),
                rideType.getSeatCapacity(),
                distanceMeters(route),
                (int) route.durationSeconds(),
                estimate.getCurrency(),
                estimate.getTotalMinor(),
                fare.lines().stream()
                        .map(line -> new FareLineResponse(
                                line.type(), line.label(), line.amount().amountMinor()))
                        .toList(),
                expiresAt);
    }
}

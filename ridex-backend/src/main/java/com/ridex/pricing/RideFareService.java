package com.ridex.pricing;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.pricing.domain.PricingRule;
import com.ridex.pricing.domain.RideType;
import com.ridex.pricing.dto.RideTypeFareRequest;
import com.ridex.pricing.dto.RideTypeFareResponse;
import com.ridex.shared.exception.NotFoundException;

import lombok.RequiredArgsConstructor;

/**
 * Cab fares as operations changes them. A change never edits the rule in force: it closes it and
 * starts a new one, so a fare quoted before the change can still be explained after it.
 */
@Service
@RequiredArgsConstructor
public class RideFareService {

    private final RideTypeRepository rideTypeRepository;
    private final PricingRuleRepository pricingRuleRepository;

    @Transactional(readOnly = true)
    public List<RideTypeFareResponse> all() {
        Instant now = Instant.now();
        return rideTypeRepository.findAll().stream()
                .sorted(java.util.Comparator.comparingInt(RideType::getSortOrder))
                .map(type -> toResponse(type, pricingRuleRepository.findInForce(type.getId(), now).orElse(null)))
                .toList();
    }

    @Transactional
    public RideTypeFareResponse change(String rideTypeId, RideTypeFareRequest request) {
        RideType type = rideTypeRepository.findById(rideTypeId)
                .orElseThrow(() -> new NotFoundException("No such ride type."));
        Instant now = Instant.now();
        PricingRule current = pricingRuleRepository.findInForce(rideTypeId, now).orElse(null);
        if (current != null) {
            current.setValidTo(now);
            pricingRuleRepository.save(current);
        }

        PricingRule next = new PricingRule();
        next.setRideType(type);
        next.setCurrency(current == null ? "INR" : current.getCurrency());
        next.setBaseFareMinor(request.baseFareMinor());
        next.setPerKmMinor(request.perKmMinor());
        next.setPerMinuteMinor(request.perMinuteMinor());
        next.setMinimumFareMinor(request.minimumFareMinor());
        next.setFreeWaitingSeconds(request.freeWaitingSeconds());
        next.setPerWaitingMinuteMinor(request.perWaitingMinuteMinor());
        if (current != null) {
            next.setSurgeMultiplier(current.getSurgeMultiplier());
        }
        next.setValidFrom(now);
        pricingRuleRepository.save(next);
        return toResponse(type, next);
    }

    private static RideTypeFareResponse toResponse(RideType type, PricingRule rule) {
        return new RideTypeFareResponse(type.getId(), type.getCode(), type.getDisplayName(), type.getSeatCapacity(),
                type.isActive(), rule == null ? "INR" : rule.getCurrency(),
                rule == null ? null : rule.getBaseFareMinor(), rule == null ? null : rule.getPerKmMinor(),
                rule == null ? null : rule.getPerMinuteMinor(), rule == null ? null : rule.getMinimumFareMinor(),
                rule == null ? null : rule.getFreeWaitingSeconds(), rule == null ? null : rule.getPerWaitingMinuteMinor(),
                rule == null ? null : rule.getValidFrom());
    }
}

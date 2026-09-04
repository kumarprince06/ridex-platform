package com.ridex.pricing;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.pricing.domain.PricingRule;

public interface PricingRuleRepository extends JpaRepository<PricingRule, String> {

    // The rule in force right now, newest first. Rules are superseded rather than edited, so the
    // fare a rider was quoted last month can still be reconstructed.
    @Query("SELECT r FROM PricingRule r WHERE r.rideType.id = :rideTypeId "
            + "AND r.validFrom <= :now AND (r.validTo IS NULL OR r.validTo > :now) "
            + "ORDER BY r.validFrom DESC LIMIT 1")
    Optional<PricingRule> findInForce(@Param("rideTypeId") String rideTypeId, @Param("now") Instant now);
}

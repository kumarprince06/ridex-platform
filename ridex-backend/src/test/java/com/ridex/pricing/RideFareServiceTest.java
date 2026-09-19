package com.ridex.pricing;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.ridex.pricing.dto.RideTypeFareRequest;

@SpringBootTest
class RideFareServiceTest {

    @Autowired private RideFareService fares;
    @Autowired private PricingRuleRepository rules;

    @Test
    void aChangeSupersedesTheFareInForceAndKeepsTheOldOne() {
        var type = fares.all().get(0);
        long before = rules.count();

        var changed = fares.change(type.rideTypeId(), new RideTypeFareRequest(4000, 1500, 200, 6000, 240, 250));

        assertThat(changed.baseFareMinor()).isEqualTo(4000);
        assertThat(rules.findInForce(type.rideTypeId(), Instant.now()).orElseThrow().getBaseFareMinor()).isEqualTo(4000);
        // Superseded, not edited: the old rule is still there for fares quoted under it.
        assertThat(rules.count()).isEqualTo(before + 1);
    }
}

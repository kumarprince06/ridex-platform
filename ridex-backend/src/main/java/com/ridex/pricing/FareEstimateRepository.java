package com.ridex.pricing;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.pricing.domain.FareEstimate;

public interface FareEstimateRepository extends JpaRepository<FareEstimate, String> {
}

package com.ridex.pricing;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.pricing.domain.RideType;

public interface RideTypeRepository extends JpaRepository<RideType, String> {

    List<RideType> findByActiveTrueOrderBySortOrderAsc();
}

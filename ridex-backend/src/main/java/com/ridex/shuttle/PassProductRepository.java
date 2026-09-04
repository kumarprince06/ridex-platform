package com.ridex.shuttle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.shuttle.domain.PassProduct;

public interface PassProductRepository extends JpaRepository<PassProduct, String> {

    List<PassProduct> findByRouteIdAndActiveTrueOrderByPriceMinorAsc(String routeId);
}

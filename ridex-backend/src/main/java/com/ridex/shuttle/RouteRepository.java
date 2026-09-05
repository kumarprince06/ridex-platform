package com.ridex.shuttle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.shuttle.domain.Route;

public interface RouteRepository extends JpaRepository<Route, String> {

    List<Route> findByActiveTrueOrderByNameAsc();

    /** Every route, active or not: operations has to be able to see what it switched off. */
    List<Route> findAllByOrderByNameAsc();

    boolean existsByCode(String code);
}

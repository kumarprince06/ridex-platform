package com.ridex.shuttle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.shuttle.domain.RouteStop;

public interface RouteStopRepository extends JpaRepository<RouteStop, String> {

    List<RouteStop> findByRouteIdOrderBySequenceAsc(String routeId);
}

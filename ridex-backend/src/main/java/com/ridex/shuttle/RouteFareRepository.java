package com.ridex.shuttle;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.shuttle.domain.RouteFare;

public interface RouteFareRepository extends JpaRepository<RouteFare, String> {

    Optional<RouteFare> findByRouteIdAndFromStopIdAndToStopId(
            String routeId, String fromStopId, String toStopId);

    java.util.List<RouteFare> findByRouteId(String routeId);

    /** Fares that would be orphaned by deleting a stop. Checked before, not caught after. */
    boolean existsByFromStopIdOrToStopId(String fromStopId, String toStopId);
}

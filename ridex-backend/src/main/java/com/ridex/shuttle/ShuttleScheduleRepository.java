package com.ridex.shuttle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.shuttle.domain.ShuttleSchedule;

public interface ShuttleScheduleRepository extends JpaRepository<ShuttleSchedule, String> {

    List<ShuttleSchedule> findByRouteIdAndActiveTrueOrderByDepartureTimeAsc(String routeId);

    List<ShuttleSchedule> findByRouteIdOrderByDepartureTimeAsc(String routeId);

    /** Schedules that actually run: switched on, on a route that is switched on. */
    @org.springframework.data.jpa.repository.Query(
            "SELECT s FROM ShuttleSchedule s WHERE s.active = true AND s.route.active = true")
    List<ShuttleSchedule> findRunning();
}

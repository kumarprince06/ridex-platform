package com.ridex.shuttle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.shuttle.domain.ShuttleSchedule;

public interface ShuttleScheduleRepository extends JpaRepository<ShuttleSchedule, String> {

    List<ShuttleSchedule> findByRouteIdAndActiveTrueOrderByDepartureTimeAsc(String routeId);

    List<ShuttleSchedule> findByRouteIdOrderByDepartureTimeAsc(String routeId);
}

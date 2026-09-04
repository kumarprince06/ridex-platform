package com.ridex.shuttle;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.shuttle.domain.ShuttleTrip;

public interface ShuttleTripRepository extends JpaRepository<ShuttleTrip, String> {

    Optional<ShuttleTrip> findByScheduleIdAndServiceDate(String scheduleId, LocalDate serviceDate);
}

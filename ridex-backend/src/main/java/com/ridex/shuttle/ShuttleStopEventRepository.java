package com.ridex.shuttle;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.shuttle.domain.ShuttleStopEvent;

public interface ShuttleStopEventRepository extends JpaRepository<ShuttleStopEvent, String> {

    List<ShuttleStopEvent> findByShuttleTripIdOrderBySequenceAsc(String shuttleTripId);

    Optional<ShuttleStopEvent> findByShuttleTripIdAndStopId(String shuttleTripId, String stopId);

    boolean existsByShuttleTripIdAndSequence(String shuttleTripId, short sequence);
}

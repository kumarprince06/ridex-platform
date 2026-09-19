package com.ridex.shuttle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.shuttle.domain.ShuttleStopEvent;

public interface ShuttleStopEventRepository extends JpaRepository<ShuttleStopEvent, String> {

    List<ShuttleStopEvent> findByShuttleTripIdOrderBySequenceAsc(String shuttleTripId);

    boolean existsByShuttleTripIdAndSequence(String shuttleTripId, short sequence);
}

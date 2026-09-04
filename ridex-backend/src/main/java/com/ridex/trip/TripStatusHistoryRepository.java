package com.ridex.trip;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ridex.trip.domain.TripStatusHistory;

public interface TripStatusHistoryRepository extends JpaRepository<TripStatusHistory, String> {

    List<TripStatusHistory> findByTripIdOrderByOccurredAtAsc(String tripId);
}

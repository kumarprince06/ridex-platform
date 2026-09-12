package com.ridex.admin;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.admin.dto.AdminTripDetailResponse;
import com.ridex.admin.dto.AdminTripResponse;
import com.ridex.admin.dto.PageResponse;
import com.ridex.pricing.domain.FareLine;
import com.ridex.pricing.dto.FareLineResponse;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.domain.RideStatus;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.trip.TripRepository;
import com.ridex.trip.TripStatusHistoryRepository;
import com.ridex.trip.domain.Trip;
import com.ridex.trip.domain.TripFareLine;

import lombok.RequiredArgsConstructor;

/** Rides, and how each one got to where it ended up. */
@Service
@RequiredArgsConstructor
public class AdminRideQueries {

    private final RideRequestRepository rideRequestRepository;
    private final TripRepository tripRepository;
    private final TripStatusHistoryRepository tripStatusHistoryRepository;
    private final AdminRowMapper rows;

    @Transactional(readOnly = true)
    public PageResponse<AdminTripResponse> trips(RideStatus status, int page, int size) {
        return PageResponse.of(
                rideRequestRepository.searchByStatus(status, AdminPaging.of(page, size, "requestedAt")),
                rows::toTrip);
    }

    /** One ride: how it moved, what it was quoted, what it was charged. */
    @Transactional(readOnly = true)
    public AdminTripDetailResponse trip(String rideId) {
        var ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new NotFoundException("No such ride."));

        // A ride only has a trip once a driver was assigned, so every trip-side field below is
        // optional rather than a null the caller has to remember to check.
        var trip = tripRepository.findByRideRequestId(rideId);

        return new AdminTripDetailResponse(
                rows.toTrip(ride),
                trip.map(Trip::getId).orElse(null),
                ride.getFareEstimate().getDistanceMeters(),
                trip.map(Trip::getActualDistanceMeters).orElse(null),
                trip.map(Trip::getActualDurationSeconds).orElse(null),
                trip.map(Trip::getWaitingSeconds).orElse(0),
                ride.getCancellationReason(),
                ride.getFareEstimate().getLines().stream()
                        .map(line -> new FareLineResponse(
                                line.getLineType(), line.getLabel(), line.getAmountMinor()))
                        .toList(),
                trip.map(this::chargedLines).orElseGet(List::of),
                trip.map(this::timeline).orElseGet(List::of));
    }

    private List<FareLineResponse> chargedLines(Trip trip) {
        return trip.getFareLines().stream()
                .map(this::toLine)
                .toList();
    }

    private FareLineResponse toLine(TripFareLine line) {
        return new FareLineResponse(line.getLineType(), line.getLabel(), line.getAmountMinor());
    }

    private List<AdminTripDetailResponse.Transition> timeline(Trip trip) {
        return tripStatusHistoryRepository.findByTripIdOrderByOccurredAtAsc(trip.getId()).stream()
                .map(row -> new AdminTripDetailResponse.Transition(
                        row.getFromStatus(), row.getToStatus(), row.getActorType(),
                        row.getActorId(), row.getReason(), row.getOccurredAt()))
                .toList();
    }
}

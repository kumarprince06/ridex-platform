package com.ridex.admin;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.admin.dto.*;
import com.ridex.auth.UserRepository;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.trip.TripRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminQueryService {

    // A page size the console cannot be talked into exceeding. An unbounded ?size= is a table
    // scan somebody will eventually run against every trip ever taken.
    private static final int MAX_PAGE_SIZE = 100;

    private static final List<RideStatus> IN_PROGRESS = List.of(
            RideStatus.SEARCHING, RideStatus.DRIVER_ASSIGNED, RideStatus.DRIVER_ARRIVING,
            RideStatus.DRIVER_AT_PICKUP, RideStatus.TRIP_STARTED);

    private final RiderProfileRepository riderProfileRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final RideRequestRepository rideRequestRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public DashboardResponse dashboard() {
        Instant startOfToday = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);

        return new DashboardResponse(
                riderProfileRepository.count(),
                driverProfileRepository.count(),
                driverProfileRepository.countByOnboardingStatus(DriverOnboardingStatus.UNDER_REVIEW),
                driverProfileRepository.countByOnDutyTrue(),
                rideRequestRepository.countByRequestedAtAfter(startOfToday),
                rideRequestRepository.countByStatusInAndRequestedAtAfter(IN_PROGRESS, Instant.EPOCH),
                rideRequestRepository.countByStatusInAndRequestedAtAfter(
                        List.of(RideStatus.COMPLETED), startOfToday),
                "INR",
                rideRequestRepository.grossFaresSince(startOfToday),
                ridesByStatus());
    }

    private java.util.Map<String, Long> ridesByStatus() {
        java.util.Map<String, Long> counts = new java.util.LinkedHashMap<>();
        for (Object[] row : rideRequestRepository.countByStatus()) {
            counts.put(((RideStatus) row[0]).name(), (Long) row[1]);
        }
        return counts;
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminRiderResponse> riders(String term, int page, int size) {
        return PageResponse.of(
                riderProfileRepository.search(term, pageable(page, size, "createdAt")),
                this::toRider);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminDriverResponse> drivers(DriverOnboardingStatus status, String term,
            int page, int size) {
        return PageResponse.of(
                driverProfileRepository.search(status, term, pageable(page, size, "createdAt")),
                this::toDriver);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminTripResponse> trips(RideStatus status, int page, int size) {
        return PageResponse.of(
                rideRequestRepository.searchByStatus(status, pageable(page, size, "requestedAt")),
                this::toTrip);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> auditLog(int page, int size) {
        Page<com.ridex.admin.domain.AuditLog> logs =
                auditLogRepository.findAllByOrderByOccurredAtDesc(
                        PageRequest.of(Math.max(0, page), clampSize(size)));

        return PageResponse.of(logs, log -> new AuditLogResponse(
                log.getId(), log.getActorEmail(), log.getAction(), log.getTargetType(),
                log.getTargetId(), log.getReason(), log.getIpAddress(), log.getOccurredAt()));
    }

    private PageRequest pageable(int page, int size, String sortBy) {
        return PageRequest.of(Math.max(0, page), clampSize(size), Sort.by(sortBy).descending());
    }

    private static int clampSize(int size) {
        return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
    }

    private AdminRiderResponse toRider(RiderProfile profile) {
        var user = profile.getUser();
        return new AdminRiderResponse(
                profile.getId(), user.getId(), user.getEmail(), user.getFirstName(),
                user.getLastName(), user.getPhone(), user.getStatus().name(),
                user.getLastLoginAt(), profile.getCreatedAt());
    }

    private AdminDriverResponse toDriver(DriverProfile profile) {
        var user = profile.getUser();
        return new AdminDriverResponse(
                profile.getId(), user.getId(), user.getEmail(), user.getFirstName(),
                user.getLastName(), user.getPhone(), profile.getOnboardingStatus(),
                profile.isOnDuty(), profile.getRating(), profile.getRatingCount(),
                profile.getCreatedAt());
    }

    private AdminTripResponse toTrip(RideRequest ride) {
        // Driver email only once one is assigned; a searching ride has none, and inventing a
        // placeholder would make an unassigned ride look assigned in a list.
        String driverEmail = ride.getAssignedDriverId() == null
                ? null
                : driverProfileRepository.findById(ride.getAssignedDriverId())
                        .map(driver -> driver.getUser().getEmail())
                        .orElse(null);

        Long finalFare = tripRepository.findByRideRequestId(ride.getId())
                .map(trip -> trip.getFinalFareMinor())
                .orElse(null);

        return new AdminTripResponse(
                ride.getId(), ride.getStatus(), ride.getRideType().getCode(),
                ride.getRider().getUser().getEmail(), driverEmail,
                ride.getPickupAddress(), ride.getDestinationAddress(),
                ride.getCurrency(), ride.getQuotedFareMinor(), finalFare, ride.getRequestedAt());
    }
}

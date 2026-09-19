package com.ridex.admin;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.admin.dto.AdminDriverResponse;
import com.ridex.admin.dto.AdminRiderDetailResponse;
import com.ridex.admin.dto.AdminRiderResponse;
import com.ridex.admin.dto.LiveDriverResponse;
import com.ridex.admin.dto.PageResponse;
import com.ridex.admin.dto.StaffResponse;
import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.UserRole;
import com.ridex.driver.DriverCard;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.location.DriverPresence;
import com.ridex.payment.PaymentService;
import com.ridex.points.PointsService;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.shared.exception.NotFoundException;

import lombok.RequiredArgsConstructor;

/** The people on the platform: riders, drivers, and where the on-duty ones are right now. */
@Service
@RequiredArgsConstructor
public class AdminPeopleQueries {

    /** Enough of a rider's history to see a pattern while somebody is still on the phone. */
    private static final int RECENT_RIDES = 20;

    private final RiderProfileRepository riderProfileRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final RideRequestRepository rideRequestRepository;
    private final DriverPresence driverPresence;
    private final DriverCard driverCard;
    private final PointsService pointsService;
    private final PaymentService paymentService;
    private final AdminRowMapper rows;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<AdminRiderResponse> riders(String term, int page, int size) {
        return PageResponse.of(
                riderProfileRepository.search(term, AdminPaging.of(page, size, "createdAt")),
                rows::toRider);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminDriverResponse> drivers(DriverOnboardingStatus status, String term,
            int page, int size) {
        return PageResponse.of(
                driverProfileRepository.search(status, term, AdminPaging.of(page, size, "createdAt")),
                rows::toDriver);
    }

    /** One driver, for the detail screen. The same shape as a list row, so nothing renders twice. */
    @Transactional(readOnly = true)
    public AdminDriverResponse driver(String driverId) {
        return driverProfileRepository.findById(driverId)
                .map(rows::toDriver)
                .orElseThrow(() -> new NotFoundException("No such driver."));
    }

    /** One rider, with the two numbers support is always asked about: points and what they owe. */
    @Transactional(readOnly = true)
    public AdminRiderDetailResponse rider(String riderId) {
        var profile = riderProfileRepository.findById(riderId)
                .orElseThrow(() -> new NotFoundException("No such rider."));

        var dues = paymentService.duesFor(profile.getId(), "INR");

        var rides = rideRequestRepository
                .findTop20ByRiderIdOrderByRequestedAtDesc(profile.getId()).stream()
                .limit(RECENT_RIDES)
                .map(rows::toTrip)
                .toList();

        return new AdminRiderDetailResponse(
                rows.toRider(profile),
                pointsService.balance(profile.getUser().getId()).balance(),
                dues.currency().getCurrencyCode(),
                dues.amountMinor(),
                rides);
    }

    /**
     * Every on-duty driver the platform can actually place, for the live map.
     *
     * <p>Positions come from Redis rather than a table: the pings are seconds old by design, and a
     * driver who stopped reporting drops off the map instead of haunting it.
     */
    @Transactional(readOnly = true)
    public List<LiveDriverResponse> liveDrivers() {
        var onDuty = driverProfileRepository.findByOnDutyTrue();
        var positions = driverPresence.positionsOf(
                onDuty.stream().map(DriverProfile::getId).toList());

        var carrying = rideRequestRepository.findByStatusIn(RideStatus.liveWithDriver()).stream()
                .map(RideRequest::getAssignedDriverId)
                .collect(Collectors.toSet());

        return onDuty.stream()
                .filter(driver -> positions.containsKey(driver.getId()))
                .map(driver -> onTheMap(driver, positions.get(driver.getId()),
                        carrying.contains(driver.getId())))
                .toList();
    }

    private LiveDriverResponse onTheMap(DriverProfile driver, DriverPresence.Position at,
            boolean onTrip) {
        var card = driverCard.forDriver(driver.getId());
        return new LiveDriverResponse(
                driver.getId(),
                card == null ? "Driver" : card.name(),
                card == null ? null : card.vehicle(),
                card == null ? null : card.registrationNumber(),
                at.latitude(),
                at.longitude(),
                onTrip);
    }

    @Transactional(readOnly = true)
    public List<StaffResponse> staff() {
        return userRepository.findByAnyRole(List.of(UserRole.SUPPORT, UserRole.OPS_ADMIN, UserRole.SUPER_ADMIN))
                .stream()
                .map(user -> new StaffResponse(
                        user.getId(),
                        user.getEmail(),
                        java.util.stream.Stream.of(user.getFirstName(), user.getLastName())
                                .filter(part -> part != null && !part.isBlank())
                                .collect(Collectors.joining(" ")),
                        user.getRoles().stream().map(Enum::name).sorted().toList(),
                        user.getStatus().name(),
                        user.getLastLoginAt(),
                        user.getCreatedAt()))
                .toList();
    }
}

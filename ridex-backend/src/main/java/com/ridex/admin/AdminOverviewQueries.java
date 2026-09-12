package com.ridex.admin;

import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.admin.domain.AuditLog;
import com.ridex.admin.dto.AnalyticsResponse;
import com.ridex.admin.dto.AuditLogResponse;
import com.ridex.admin.dto.DashboardResponse;
import com.ridex.admin.dto.PageResponse;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverOnboardingStatus;
import com.ridex.payment.PaymentRepository;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.domain.RideStatus;
import com.ridex.rider.RiderProfileRepository;

import lombok.RequiredArgsConstructor;

/**
 * The numbers the console opens on, and the trail of who changed what.
 *
 * <p>Counts and charts rather than records: nothing here is about one rider, one ride or one
 * payment, which is why it is not in the services that are.
 */
@Service
@RequiredArgsConstructor
public class AdminOverviewQueries {

    private static final List<RideStatus> IN_PROGRESS = List.of(
            RideStatus.SEARCHING, RideStatus.DRIVER_ASSIGNED, RideStatus.DRIVER_ARRIVING,
            RideStatus.DRIVER_AT_PICKUP, RideStatus.TRIP_STARTED);

    /** The longest window the charts will draw. Ninety days of daily points is already a lot. */
    private static final int MAX_WINDOW_DAYS = 90;

    private final RiderProfileRepository riderProfileRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final RideRequestRepository rideRequestRepository;
    private final PaymentRepository paymentRepository;
    private final AuditLogRepository auditLogRepository;

    @Value("${app.reporting.zone}")
    private String reportingZone;

    @Transactional(readOnly = true)
    public DashboardResponse dashboard() {
        ZoneId zone = ZoneId.of(reportingZone);
        Instant startOfToday = LocalDate.now(zone).atStartOfDay(zone).toInstant();

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

    private Map<String, Long> ridesByStatus() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Object[] row : rideRequestRepository.countByStatus()) {
            counts.put(((RideStatus) row[0]).name(), (Long) row[1]);
        }
        return counts;
    }

    /**
     * Daily counts for the console's charts.
     *
     * <p>Every day in the window appears, including empty ones: a line that skips them draws a
     * trend that did not happen.
     */
    @Transactional(readOnly = true)
    public AnalyticsResponse analytics(int days) {
        int window = Math.min(Math.max(days, 1), MAX_WINDOW_DAYS);
        // The axis and the SQL grouping must agree on where a day starts, or today's rides land
        // outside the window they are plotted against.
        ZoneId zone = ZoneId.of(reportingZone);
        LocalDate from = LocalDate.now(zone).minusDays(window - 1L);
        Instant since = from.atStartOfDay(zone).toInstant();

        Map<LocalDate, Long> requested = new HashMap<>();
        for (Object[] row : rideRequestRepository.dailyRequested(since, reportingZone)) {
            requested.put(toLocalDate(row[0]), ((Number) row[1]).longValue());
        }

        Map<LocalDate, long[]> completed = new HashMap<>();
        for (Object[] row : rideRequestRepository.dailyCompleted(since, reportingZone)) {
            completed.put(toLocalDate(row[0]),
                    new long[] {((Number) row[1]).longValue(), ((Number) row[2]).longValue()});
        }

        List<AnalyticsResponse.DayPoint> points = new ArrayList<>();
        for (int i = 0; i < window; i++) {
            LocalDate day = from.plusDays(i);
            long[] done = completed.getOrDefault(day, new long[] {0, 0});
            points.add(new AnalyticsResponse.DayPoint(
                    day.toString(), requested.getOrDefault(day, 0L), done[0], done[1]));
        }

        List<AnalyticsResponse.StatusSlice> byStatus = ridesByStatus().entrySet().stream()
                .map(entry -> new AnalyticsResponse.StatusSlice(entry.getKey(), entry.getValue()))
                .sorted((a, b) -> Long.compare(b.count(), a.count()))
                .toList();

        List<AnalyticsResponse.StatusSlice> byMethod = paymentRepository.findAll().stream()
                .collect(Collectors.groupingBy(
                        payment -> payment.getMethod().name(),
                        Collectors.counting()))
                .entrySet().stream()
                .map(entry -> new AnalyticsResponse.StatusSlice(entry.getKey(), entry.getValue()))
                .sorted((a, b) -> Long.compare(b.count(), a.count()))
                .toList();

        return new AnalyticsResponse("INR", points, byStatus, byMethod);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> auditLog(int page, int size) {
        Page<AuditLog> logs =
                auditLogRepository.findAllByOrderByOccurredAtDesc(
                        AdminPaging.of(page, size));

        return PageResponse.of(logs, log -> new AuditLogResponse(
                log.getId(), log.getActorEmail(), log.getAction(), log.getTargetType(),
                log.getTargetId(), log.getReason(), log.getIpAddress(), log.getOccurredAt()));
    }

    /** A native DATE() comes back as Date or LocalDate depending on the driver. */
    private static LocalDate toLocalDate(Object value) {
        return value instanceof LocalDate date ? date : ((Date) value).toLocalDate();
    }
}

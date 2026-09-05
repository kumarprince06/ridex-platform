package com.ridex.shuttle;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.shuttle.domain.ShuttleTrip;

public interface ShuttleTripRepository extends JpaRepository<ShuttleTrip, String> {

    Optional<ShuttleTrip> findByScheduleIdAndServiceDate(String scheduleId, LocalDate serviceDate);

    /** What this driver is running on one day, earliest first. */
    java.util.List<ShuttleTrip> findByDriverIdAndServiceDateOrderByDepartsAtAsc(
            String driverId, LocalDate serviceDate);

    /**
     * Creates the departure if nobody has yet.
     *
     * <p>ON CONFLICT DO NOTHING rather than catch-and-retry: in Postgres a failed statement poisons
     * the whole transaction, so recovering from a duplicate-key error inside the booking that hit
     * it is not possible. Letting the database absorb the conflict means the loser simply reads the
     * row the winner wrote.
     */
    @Modifying
    @Query(value = """
            INSERT INTO shuttle_trips
                (id, schedule_id, service_date, departs_at, seat_capacity, seats_per_row,
                 status, created_at, version)
            VALUES (:id, :scheduleId, :serviceDate, :departsAt, :seatCapacity, :seatsPerRow,
                    'SCHEDULED', now(), 0)
            ON CONFLICT (schedule_id, service_date) DO NOTHING
            """, nativeQuery = true)
    void insertIfAbsent(@Param("id") String id,
            @Param("scheduleId") String scheduleId,
            @Param("serviceDate") LocalDate serviceDate,
            @Param("departsAt") Instant departsAt,
            @Param("seatCapacity") short seatCapacity,
            @Param("seatsPerRow") short seatsPerRow);
}

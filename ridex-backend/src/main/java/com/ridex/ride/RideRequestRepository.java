package com.ridex.ride;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;

public interface RideRequestRepository extends JpaRepository<RideRequest, String> {

    java.util.List<RideRequest> findByStatusIn(java.util.Collection<RideStatus> statuses);

    /** Every ride a rider has taken, newest first - the admin's rider page, capped by the caller. */
    java.util.List<RideRequest> findTop20ByRiderIdOrderByRequestedAtDesc(String riderId);


    /**
     * The rider's own history, minus the searches that never found a driver.
     *
     * <p>Filtered in the query rather than after loading: a rider in a quiet area can accumulate
     * plenty of these, and they would all be fetched only to be dropped.
     */
    List<RideRequest> findByRiderIdAndStatusNotOrderByRequestedAtDesc(String riderId, RideStatus status);

    // Scoped by rider as well as id: an ownership check nobody can forget to write.
    Optional<RideRequest> findByIdAndRiderId(String id, String riderId);

    boolean existsByFareEstimateId(String fareEstimateId);

    // The sweep's queue: rides still looking for a driver, oldest first so nobody is starved. Ids
    // only, read without locks; each ride is locked on its own in lockIfSearching.
    @Query("SELECT r.id FROM RideRequest r WHERE r.status = :searching ORDER BY r.requestedAt")
    List<String> findSearchingIds(@Param("searching") RideStatus searching);

    /**
     * Locks one searching ride for the sweep, or nothing if it moved on or somebody holds it.
     *
     * <p>SKIP LOCKED: a ride an accept is holding is about to stop searching, and another node's
     * sweep already has it - waiting would only queue behind a decision already being made. NO KEY
     * UPDATE rather than UPDATE: the sweep inserts offers in a REQUIRES_NEW transaction, and their
     * foreign key check takes a KEY SHARE lock that plain FOR UPDATE would block forever.
     */
    @Query(value = "SELECT * FROM ride_requests WHERE id = :id AND status = 'SEARCHING' "
            + "FOR NO KEY UPDATE SKIP LOCKED", nativeQuery = true)
    Optional<RideRequest> lockIfSearching(@Param("id") String id);

    @Query("SELECT r FROM RideRequest r WHERE :status IS NULL OR r.status = :status")
    Page<RideRequest> searchByStatus(@Param("status") RideStatus status, Pageable pageable);

    long countByRequestedAtAfter(Instant since);

    // One query for the whole breakdown, rather than a count per status.
    @Query("SELECT r.status, COUNT(r) FROM RideRequest r GROUP BY r.status")
    List<Object[]> countByStatus();

    // Grouped in the database rather than pulling every ride back to count them in Java.
    @Query(value = "SELECT DATE(requested_at AT TIME ZONE :zone) AS day, COUNT(*) FROM ride_requests "
            + "WHERE requested_at >= :since GROUP BY day", nativeQuery = true)
    List<Object[]> dailyRequested(@Param("since") Instant since, @Param("zone") String zone);

    @Query(value = "SELECT DATE(t.completed_at AT TIME ZONE :zone) AS day, COUNT(*), "
            + "COALESCE(SUM(t.final_fare_minor), 0) "
            + "FROM trips t WHERE t.completed_at >= :since GROUP BY day", nativeQuery = true)
    List<Object[]> dailyCompleted(@Param("since") Instant since, @Param("zone") String zone);

    long countByStatusInAndRequestedAtAfter(java.util.Collection<RideStatus> statuses, Instant since);

    @Query("SELECT COALESCE(SUM(t.finalFareMinor), 0) FROM com.ridex.trip.domain.Trip t "
            + "WHERE t.completedAt >= :since")
    long grossFaresSince(@Param("since") Instant since);

    /**
     * The dispatch arbiter. One ride row, one winner.
     *
     * <p>Two drivers racing hold two different offer rows, so a conditional update on the offer
     * cannot separate them - both would succeed. They must contend for the ride itself. Zero rows
     * updated means somebody else already has it.
     *
     * <p>Claiming the ride before touching the offer also fixes the ordering: both transactions
     * queue on the same row here, so the loser reads the new status and leaves, instead of both
     * reaching the offers table and deadlocking on its unique index.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RideRequest r SET r.status = :assigned, r.assignedDriverId = :driverId, "
            + "r.assignedAt = :now WHERE r.id = :rideId AND r.status = :searching")
    int assignDriver(@Param("rideId") String rideId,
            @Param("driverId") String driverId,
            @Param("now") Instant now,
            @Param("searching") RideStatus searching,
            @Param("assigned") RideStatus assigned);
}

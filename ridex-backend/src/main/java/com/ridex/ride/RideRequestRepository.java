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

    List<RideRequest> findByRiderIdOrderByRequestedAtDesc(String riderId);

    // Scoped by rider as well as id: an ownership check nobody can forget to write.
    Optional<RideRequest> findByIdAndRiderId(String id, String riderId);

    boolean existsByFareEstimateId(String fareEstimateId);

    // The sweep's queue: rides still looking for a driver, oldest first so nobody is starved.
    @Query("SELECT r FROM RideRequest r WHERE r.status = :searching ORDER BY r.requestedAt")
    List<RideRequest> findSearching(@Param("searching") RideStatus searching);

    @Query("SELECT r FROM RideRequest r WHERE :status IS NULL OR r.status = :status")
    Page<RideRequest> searchByStatus(@Param("status") RideStatus status, Pageable pageable);

    long countByRequestedAtAfter(Instant since);

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

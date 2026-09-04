package com.ridex.dispatch;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.dispatch.domain.OfferStatus;
import com.ridex.dispatch.domain.RideOffer;

public interface RideOfferRepository extends JpaRepository<RideOffer, String> {

    /**
     * The claim. One statement, one row, the database as arbiter.
     *
     * <p>A zero row count means the offer was already taken or has expired. Reading the row first
     * and then writing it loses this race at every rush hour, and an application-level lock is a
     * race with extra steps.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RideOffer o SET o.status = :accepted, o.respondedAt = :now "
            + "WHERE o.id = :offerId AND o.driver.id = :driverId "
            + "AND o.status = :offered AND o.expiresAt > :now")
    int claim(@Param("offerId") String offerId,
            @Param("driverId") String driverId,
            @Param("now") Instant now,
            @Param("offered") OfferStatus offered,
            @Param("accepted") OfferStatus accepted);

    /** Everyone else on this ride loses, in one statement rather than one round trip each. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RideOffer o SET o.status = :superseded, o.respondedAt = :now "
            + "WHERE o.rideRequest.id = :rideId AND o.id <> :winningOfferId "
            + "AND o.status = :offered")
    int supersedeOthers(@Param("rideId") String rideId,
            @Param("winningOfferId") String winningOfferId,
            @Param("now") Instant now,
            @Param("offered") OfferStatus offered,
            @Param("superseded") OfferStatus superseded);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RideOffer o SET o.status = :rejected, o.respondedAt = :now "
            + "WHERE o.id = :offerId AND o.driver.id = :driverId AND o.status = :offered")
    int reject(@Param("offerId") String offerId,
            @Param("driverId") String driverId,
            @Param("now") Instant now,
            @Param("offered") OfferStatus offered,
            @Param("rejected") OfferStatus rejected);

    @Query("SELECT o FROM RideOffer o WHERE o.driver.id = :driverId "
            + "AND o.status = :offered AND o.expiresAt > :now ORDER BY o.offeredAt")
    List<RideOffer> findLiveForDriver(@Param("driverId") String driverId,
            @Param("now") Instant now, @Param("offered") OfferStatus offered);

    Optional<RideOffer> findByIdAndDriverId(String id, String driverId);

    @Query("SELECT o.driver.id FROM RideOffer o WHERE o.rideRequest.id = :rideId")
    List<String> findDriverIdsAlreadyOffered(@Param("rideId") String rideId);

    @Modifying
    @Query("UPDATE RideOffer o SET o.status = :expired WHERE o.status = :offered AND o.expiresAt <= :now")
    int expireOverdue(@Param("now") Instant now,
            @Param("offered") OfferStatus offered, @Param("expired") OfferStatus expired);
}

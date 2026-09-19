package com.ridex.shuttle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.shuttle.domain.ShuttleBooking;

public interface ShuttleBookingRepository extends JpaRepository<ShuttleBooking, String> {

    /**
     * Seats already sold over a stretch of the route.
     *
     * <p>Half-open intervals: a booking that ends where this one starts does not overlap it, which
     * is the whole point - the passenger getting off at stop 2 vacates the seat for the one
     * getting on there. Cancelled seats are free again, so the filter is on status too.
     */
    @Query("SELECT b.seatLabel FROM ShuttleBooking b "
            + "WHERE b.shuttleTrip.id = :tripId AND b.status = 'BOOKED' "
            + "AND b.boardingSeq < :alightingSeq AND b.alightingSeq > :boardingSeq")
    List<String> takenSeatsOverLeg(@Param("tripId") String tripId,
            @Param("boardingSeq") short boardingSeq,
            @Param("alightingSeq") short alightingSeq);

    /** Every live seat on the departure, whatever leg it covers. Used for the "sold" count. */
    @Query("SELECT b.seatLabel FROM ShuttleBooking b "
            + "WHERE b.shuttleTrip.id = :tripId AND b.status = 'BOOKED'")
    List<String> takenSeats(@Param("tripId") String tripId);

    List<ShuttleBooking> findByRiderIdOrderByCreatedAtDesc(String riderId);

    /** Whether this rider already holds a live seat on this departure from the same stop. */
    @Query("SELECT COUNT(b) > 0 FROM ShuttleBooking b WHERE b.shuttleTrip.id = :tripId "
            + "AND b.rider.id = :riderId AND b.boardingSeq = :boardingSeq AND b.status = 'BOOKED'")
    boolean hasLiveSeatOnLeg(@Param("tripId") String tripId, @Param("riderId") String riderId,
            @Param("boardingSeq") short boardingSeq);

    /** Seats held for a checkout that never finished. */
    @Query("SELECT b FROM ShuttleBooking b WHERE b.paymentStatus = 'PENDING' "
            + "AND b.status = 'BOOKED' AND b.holdExpiresAt < :now")
    List<ShuttleBooking> expiredHolds(@Param("now") java.time.Instant now);

    @Query("SELECT b FROM ShuttleBooking b WHERE b.id = :id AND b.rider.id = :riderId")
    java.util.Optional<ShuttleBooking> findOwn(@Param("id") String id, @Param("riderId") String riderId);

    /** Everything ever sold on a departure, cancelled seats included - the ops view of a run. */
    @Query("SELECT b FROM ShuttleBooking b WHERE b.shuttleTrip.id = :tripId ORDER BY b.seatLabel ASC")
    List<ShuttleBooking> everySeatOn(@Param("tripId") String tripId);

    /** Whether this user holds a live seat on the departure - who may watch it move. */
    @Query("SELECT COUNT(b) > 0 FROM ShuttleBooking b WHERE b.shuttleTrip.id = :tripId "
            + "AND b.rider.user.id = :userId AND b.status <> 'CANCELLED'")
    boolean isRiderOn(@Param("tripId") String tripId, @Param("userId") String userId);

    /** Whether any seat, in any state, was ever sold from or to this stop - its history pins it. */
    @Query("SELECT COUNT(b) > 0 FROM ShuttleBooking b WHERE b.boardingStopId = :stopId OR b.alightingStopId = :stopId")
    boolean everUsedStop(@Param("stopId") String stopId);

    /**
     * The manifest. Cancelled seats are out - nobody is waiting for them - and so are seats still
     * in checkout: prepaid only, so an unpaid hold is not a passenger yet.
     */
    @Query("SELECT b FROM ShuttleBooking b WHERE b.shuttleTrip.id = :tripId "
            + "AND b.status <> 'CANCELLED' AND b.paymentStatus <> 'PENDING' ORDER BY b.seatLabel ASC")
    List<ShuttleBooking> manifestFor(@Param("tripId") String tripId);
}

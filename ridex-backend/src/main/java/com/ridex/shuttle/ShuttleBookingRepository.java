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

    @Query("SELECT b FROM ShuttleBooking b WHERE b.id = :id AND b.rider.id = :riderId")
    java.util.Optional<ShuttleBooking> findOwn(@Param("id") String id, @Param("riderId") String riderId);

    /** The manifest. Cancelled seats are excluded - nobody is waiting at that stop for them. */
    @Query("SELECT b FROM ShuttleBooking b WHERE b.shuttleTrip.id = :tripId "
            + "AND b.status <> 'CANCELLED' ORDER BY b.seatLabel ASC")
    List<ShuttleBooking> manifestFor(@Param("tripId") String tripId);
}

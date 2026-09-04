package com.ridex.shuttle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.shuttle.domain.ShuttleBooking;

public interface ShuttleBookingRepository extends JpaRepository<ShuttleBooking, String> {

    // Which seats are gone. Cancelled ones are free again, so the filter is on status.
    @Query("SELECT b.seatLabel FROM ShuttleBooking b "
            + "WHERE b.shuttleTrip.id = :tripId AND b.status = 'BOOKED'")
    List<String> takenSeats(@Param("tripId") String tripId);

    List<ShuttleBooking> findByRiderIdOrderByCreatedAtDesc(String riderId);

    @Query("SELECT b FROM ShuttleBooking b WHERE b.id = :id AND b.rider.id = :riderId")
    java.util.Optional<ShuttleBooking> findOwn(@Param("id") String id, @Param("riderId") String riderId);
}

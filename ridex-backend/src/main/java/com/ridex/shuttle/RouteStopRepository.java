package com.ridex.shuttle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.shuttle.domain.RouteStop;

public interface RouteStopRepository extends JpaRepository<RouteStop, String> {

    List<RouteStop> findByRouteIdOrderBySequenceAsc(String routeId);

    /**
     * Renumbers a route's stops 1..n in their current order, and the leg numbers every booking on
     * the route carries with them. Two passes: the seat-overlap exclusion is checked row by row, so
     * rows are first parked out of range (+1000), then set, and no half-renumbered pair ever meets.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            UPDATE route_stops SET sequence = sequence + 1000 WHERE route_id = :routeId;
            UPDATE route_stops s SET sequence = r.n
              FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY sequence) AS n
                      FROM route_stops WHERE route_id = :routeId) r
             WHERE s.id = r.id;
            UPDATE shuttle_bookings b SET boarding_seq = boarding_seq + 1000, alighting_seq = alighting_seq + 1000
             WHERE b.boarding_stop_id IN (SELECT id FROM route_stops WHERE route_id = :routeId);
            UPDATE shuttle_bookings b
               SET boarding_seq = (SELECT sequence FROM route_stops WHERE id = b.boarding_stop_id),
                   alighting_seq = (SELECT sequence FROM route_stops WHERE id = b.alighting_stop_id)
             WHERE b.boarding_stop_id IN (SELECT id FROM route_stops WHERE route_id = :routeId)
            """, nativeQuery = true)
    void renumber(@Param("routeId") String routeId);

    /** Makes room after a position: every stop past it moves up one, parked out of range first. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            UPDATE route_stops SET sequence = sequence + 1001 WHERE route_id = :routeId AND sequence > :after;
            """, nativeQuery = true)
    void openGapAfter(@Param("routeId") String routeId, @Param("after") int after);
}

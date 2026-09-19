package com.ridex.shuttle;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.shuttle.dto.AdminRouteSummary;

import com.ridex.shuttle.domain.Route;

public interface RouteRepository extends JpaRepository<Route, String> {

    List<Route> findByActiveTrueOrderByNameAsc();

    /** Every route, active or not: operations has to be able to see what it switched off. */
    List<Route> findAllByOrderByNameAsc();

    boolean existsByCode(String code);

    /** Anything a rider bought on the route - a seat on any departure, or a pass. Those records must survive. */
    @Query(value = """
            SELECT EXISTS (SELECT 1 FROM shuttle_bookings b
                             JOIN shuttle_trips t ON t.id = b.shuttle_trip_id
                             JOIN shuttle_schedules s ON s.id = t.schedule_id
                            WHERE s.route_id = :routeId)
                OR EXISTS (SELECT 1 FROM passes p WHERE p.route_id = :routeId)
            """, nativeQuery = true)
    boolean hasRiderHistory(@Param("routeId") String routeId);

    /**
     * The route and everything hanging off it, in the database: departures first (they do not
     * cascade from the schedule), then the route row, whose delete cascades to stops, fares,
     * schedules and pass products together. Only called once nothing was ever sold on it.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            DELETE FROM shuttle_stop_events WHERE shuttle_trip_id IN (
                SELECT t.id FROM shuttle_trips t JOIN shuttle_schedules s ON s.id = t.schedule_id WHERE s.route_id = :routeId);
            DELETE FROM shuttle_trips WHERE schedule_id IN (SELECT id FROM shuttle_schedules WHERE route_id = :routeId);
            DELETE FROM route_fares WHERE route_id = :routeId;
            DELETE FROM routes WHERE id = :routeId
            """, nativeQuery = true)
    void deleteWithEverything(@Param("routeId") String routeId);

    /**
     * The list page, counted in the database.
     *
     * <p>Correlated subqueries rather than three round trips per row: this is one statement whose
     * cost does not grow with the page size, and the counts are the only thing the list shows.
     */
    @Query("""
            SELECT new com.ridex.shuttle.dto.AdminRouteSummary(
                r.id, r.code, r.name, r.description, r.active,
                (SELECT COUNT(s) FROM RouteStop s WHERE s.route.id = r.id),
                (SELECT COUNT(f) FROM RouteFare f WHERE f.routeId = r.id),
                (SELECT COUNT(d) FROM ShuttleSchedule d WHERE d.route.id = r.id AND d.active = true))
            FROM Route r
            ORDER BY r.name ASC
            """)
    Page<AdminRouteSummary> summaries(Pageable pageable);
}

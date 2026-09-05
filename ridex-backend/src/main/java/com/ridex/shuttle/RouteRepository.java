package com.ridex.shuttle;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.ridex.shuttle.dto.AdminRouteSummary;

import com.ridex.shuttle.domain.Route;

public interface RouteRepository extends JpaRepository<Route, String> {

    List<Route> findByActiveTrueOrderByNameAsc();

    /** Every route, active or not: operations has to be able to see what it switched off. */
    List<Route> findAllByOrderByNameAsc();

    boolean existsByCode(String code);

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

package com.ridex.shuttle;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.shuttle.domain.Pass;

public interface PassRepository extends JpaRepository<Pass, String> {

    List<Pass> findByRiderIdOrderByEndsOnDesc(String riderId);

    // The lookup on every shuttle booking: does this rider hold a live pass for this route?
    @Query("SELECT p FROM Pass p WHERE p.rider.id = :riderId AND p.routeId = :routeId "
            + "AND p.status = 'ACTIVE' AND p.startsOn <= :on AND p.endsOn >= :on "
            + "ORDER BY p.endsOn ASC")
    List<Pass> findLive(@Param("riderId") String riderId, @Param("routeId") String routeId,
            @Param("on") LocalDate on);

    Optional<Pass> findByIdAndRiderId(String id, String riderId);
}

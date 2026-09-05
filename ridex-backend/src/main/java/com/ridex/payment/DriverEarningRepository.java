package com.ridex.payment;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.payment.domain.DriverEarning;

public interface DriverEarningRepository extends JpaRepository<DriverEarning, String> {

    Optional<DriverEarning> findByTripId(String tripId);

    List<DriverEarning> findTop50ByDriverIdOrderByCreatedAtDesc(String driverId);

    @Query("SELECT COALESCE(SUM(e.netAmountMinor), 0) FROM DriverEarning e WHERE e.driver.id = :driverId")
    long totalNetFor(@Param("driverId") String driverId);

    /** Earnings no payout has claimed. This is the batch, and the reason a trip cannot pay twice. */
    List<DriverEarning> findByDriverIdAndPayoutIdIsNullOrderByCreatedAtAsc(String driverId);

    List<DriverEarning> findByPayoutIdOrderByCreatedAtAsc(String payoutId);

    /** Drivers with money owed, so a batch run does not have to walk every driver on the platform. */
    @Query("SELECT DISTINCT e.driver.id FROM DriverEarning e WHERE e.payoutId IS NULL")
    List<String> driverIdsWithUnsettledEarnings();
}

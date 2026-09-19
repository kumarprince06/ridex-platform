package com.ridex.wallet;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DriverWalletTopUpRepository extends JpaRepository<DriverWalletTopUp, String> {

    Optional<DriverWalletTopUp> findByIdAndDriverId(String id, String driverId);

    Optional<DriverWalletTopUp> findByDriverIdAndIdempotencyKey(String driverId, String idempotencyKey);

    /** An unpaid checkout for the same amount is reopened, not duplicated. */
    Optional<DriverWalletTopUp> findFirstByDriverIdAndStatusAndAmountMinorOrderByCreatedAtDesc(
            String driverId, String status, long amountMinor);

    boolean existsByProviderPaymentId(String providerPaymentId);
}

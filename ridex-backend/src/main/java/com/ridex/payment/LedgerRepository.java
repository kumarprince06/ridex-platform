package com.ridex.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.payment.domain.LedgerAccountType;
import com.ridex.payment.domain.LedgerEntry;

public interface LedgerRepository extends JpaRepository<LedgerEntry, String> {

    // Credits minus debits. The balance is derived every time, never stored.
    @Query("SELECT COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amountMinor "
            + "ELSE -e.amountMinor END), 0) FROM LedgerEntry e "
            + "WHERE e.accountType = :type AND e.accountId = :accountId")
    long balanceOf(@Param("type") LedgerAccountType type, @Param("accountId") String accountId);

    boolean existsByIdempotencyKey(String idempotencyKey);
}

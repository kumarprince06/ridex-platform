package com.ridex.notification;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.QueryHints;
import jakarta.persistence.QueryHint;

public interface OutboxRepository extends JpaRepository<OutboxMessage, String> {

    // SKIP LOCKED so several API nodes can run the worker without sending anything twice.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("SELECT m FROM OutboxMessage m WHERE m.status = com.ridex.notification.OutboxStatus.PENDING "
            + "AND m.nextAttemptAt <= :now ORDER BY m.createdAt")
    List<OutboxMessage> claimBatch(@Param("now") Instant now, org.springframework.data.domain.Pageable page);
}

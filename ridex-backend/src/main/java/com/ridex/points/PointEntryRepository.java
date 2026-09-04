package com.ridex.points;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ridex.points.domain.PointEntry;

public interface PointEntryRepository extends JpaRepository<PointEntry, String> {

    // The balance is a sum over the entries, never a stored field that can drift from them.
    @Query("SELECT COALESCE(SUM(e.points), 0) FROM PointEntry e WHERE e.userId = :userId")
    int balanceOf(@Param("userId") String userId);

    List<PointEntry> findTop50ByUserIdOrderByCreatedAtDesc(String userId);

    boolean existsByIdempotencyKey(String idempotencyKey);
}

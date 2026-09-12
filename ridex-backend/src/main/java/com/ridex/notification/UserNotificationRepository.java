package com.ridex.notification;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserNotificationRepository extends JpaRepository<UserNotification, String> {

    List<UserNotification> findTop50ByUserIdOrderByCreatedAtDesc(String userId);

    long countByUserIdAndReadAtIsNull(String userId);

    /**
     * Marks the whole feed read in one statement.
     *
     * <p>Opening the screen is the acknowledgement, so this runs once rather than per row - fifty
     * updates for one glance is fifty round trips nobody asked for.
     */
    // clearAutomatically, or a read after this in the same transaction hands back the cached
    // rows and the dots survive the tap that cleared them.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    // The time comes in as a parameter rather than CURRENT_TIMESTAMP: the column is an Instant,
    // and the database's own clock type does not always survive the comparison.
    @Query("UPDATE UserNotification n SET n.readAt = :now "
            + "WHERE n.userId = :userId AND n.readAt IS NULL")
    int markAllRead(@Param("userId") String userId, @Param("now") Instant now);
}

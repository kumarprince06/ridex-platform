package com.ridex.support.domain;

import java.time.Instant;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "support_tickets")
public class SupportTicket {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    // Not "riderId": a driver raises tickets too, and often against a rider.
    @Column(name = "raised_by_user_id", nullable = false, length = 26, updatable = false)
    private String raisedByUserId;

    @Column(name = "raised_by_role", nullable = false, length = 20, updatable = false)
    private String raisedByRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private TicketCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private TicketPriority priority = TicketPriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TicketStatus status = TicketStatus.OPEN;

    @Column(name = "subject", nullable = false, length = 160)
    private String subject;

    @Column(name = "ride_id", length = 26)
    private String rideId;

    @Column(name = "against_user_id", length = 26)
    private String againstUserId;

    @Column(name = "assigned_to_user_id", length = 26)
    private String assignedToUserId;

    // The number a support SLA is actually measured on, so it is stamped once and never moved.
    @Column(name = "first_response_at")
    private Instant firstResponseAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolution", length = 1000)
    private String resolution;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public boolean isClosed() {
        return status == TicketStatus.RESOLVED || status == TicketStatus.CLOSED;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}

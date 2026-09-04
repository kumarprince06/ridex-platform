package com.ridex.dispatch.domain;

import java.time.Instant;

import com.ridex.driver.domain.DriverProfile;
import com.ridex.ride.domain.RideRequest;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "ride_offers")
public class RideOffer {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ride_request_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_ride_offers_request"))
    private RideRequest rideRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_ride_offers_driver"))
    private DriverProfile driver;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OfferStatus status = OfferStatus.OFFERED;

    @Column(name = "wave", nullable = false)
    private short wave = 1;

    @Column(name = "distance_meters")
    private Integer distanceMeters;

    @Column(name = "offered_at", nullable = false, updatable = false)
    private Instant offeredAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    public boolean isLiveAt(Instant now) {
        return status == OfferStatus.OFFERED && expiresAt.isAfter(now);
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
        this.offeredAt = Instant.now();
    }
}

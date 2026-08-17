package com.ridex.domain.vehicle;

import java.time.Instant;

import com.ridex.domain.driver.DriverProfile;
import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
    name = "driver_vehicles",
    uniqueConstraints = {
        @UniqueConstraint(
            columnNames = "registration_number",
            name = "uk_driver_vehicles_registration")
    }
)
public class DriverVehicle {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "driver_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_driver_vehicles_driver")
    )
    private DriverProfile driver;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 30)
    private VehicleType vehicleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private VehicleStatus status = VehicleStatus.PENDING_REVIEW;

    @Column(name = "make", nullable = false, length = 60)
    private String make;

    @Column(name = "model", nullable = false, length = 60)
    private String model;

    @Column(name = "manufacture_year", nullable = false)
    private short manufactureYear;

    @Column(name = "color", length = 30)
    private String color;

    @Column(name = "seat_capacity", nullable = false)
    private short seatCapacity;

    /** Unique platform-wide: one plate, one vehicle, so a car cannot run two concurrent trips. */
    @Column(name = "registration_number", nullable = false, length = 20)
    private String registrationNumber;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public boolean isUsableForTrips() {
        return status.isUsableForTrips();
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

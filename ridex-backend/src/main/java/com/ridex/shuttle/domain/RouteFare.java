package com.ridex.shuttle.domain;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A published fare between two stops. Fixed: a commute taken twice a day cannot surge. */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "route_fares")
public class RouteFare {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @Column(name = "route_id", nullable = false, length = 26)
    private String routeId;

    @Column(name = "from_stop_id", nullable = false, length = 26)
    private String fromStopId;

    @Column(name = "to_stop_id", nullable = false, length = 26)
    private String toStopId;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "fare_minor", nullable = false)
    private long fareMinor;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
    }
}

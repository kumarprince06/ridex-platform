package com.ridex.shuttle.domain;

import java.math.BigDecimal;

import com.ridex.shared.util.UlidGenerator;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "route_stops")
public class RouteStop {

    @Id
    @Column(name = "id", nullable = false, length = 26, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_route_stops_route"))
    private Route route;

    /** Order along the route. A rider travels forwards only, and this is what says so. */
    @Column(name = "sequence", nullable = false)
    private short sequence;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "latitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 9, scale = 6)
    private BigDecimal longitude;

    // Minutes after departure, so one row serves every departure on the route.
    @Column(name = "offset_minutes", nullable = false)
    private short offsetMinutes;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UlidGenerator.generateUlid();
        }
    }
}

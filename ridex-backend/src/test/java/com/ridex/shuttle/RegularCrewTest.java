package com.ridex.shuttle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.driver.DriverEligibility;
import com.ridex.driver.DriverProfileService;
import com.ridex.shared.exception.ValidationException;
import com.ridex.shuttle.dto.AdminRouteResponse;
import com.ridex.shuttle.dto.AssignDepartureRequest;
import com.ridex.shuttle.dto.FareMatrixRequest;
import com.ridex.shuttle.dto.RouteRequest;
import com.ridex.shuttle.dto.ScheduleRequest;
import com.ridex.shuttle.dto.StopRequest;
import com.ridex.vehicle.DriverVehicleRepository;
import com.ridex.vehicle.domain.DriverVehicle;
import com.ridex.vehicle.domain.VehicleStatus;
import com.ridex.vehicle.domain.VehicleType;

@SpringBootTest
class RegularCrewTest {

    // Documents and approval are the eligibility service's own tests; here only the crew wiring is.
    @MockitoBean private DriverEligibility driverEligibility;
    @Autowired private AdminShuttleService admin;
    @Autowired private ShuttleService shuttleService;
    @Autowired private DriverProfileService driverProfileService;
    @Autowired private DriverVehicleRepository vehicleRepository;
    @Autowired private UserRepository userRepository;

    private AdminRouteResponse route;

    @BeforeEach
    void setUp() {
        when(driverEligibility.blockedReason(anyString())).thenReturn(null);
        route = admin.create(new RouteRequest("C" + System.nanoTime() % 1_000_000_000L, "Crew test", null, true));
        admin.addStop(route.id(), stop("A", 0), null);
        route = admin.addStop(route.id(), stop("B", 10), null);
        admin.setFares(route.id(), new FareMatrixRequest("INR", List.of(
                new FareMatrixRequest.Leg(route.stops().get(0).id(), route.stops().get(1).id(), 3000))));
        route = admin.addSchedule(route.id(), new ScheduleRequest(LocalTime.of(8, 0), "1,2,3,4,5,6,7", 12, 3, true));
    }

    @Test
    void aRegularCrewRunsEveryUpcomingDayWithNobodyOnIt() {
        DriverVehicle bus = vehicle(20);
        String scheduleId = route.schedules().get(0).id();

        var updated = admin.setRegularCrew(route.id(), scheduleId,
                new AssignDepartureRequest(bus.getDriver().getId(), bus.getId()));

        assertThat(updated.schedules().get(0).driverId()).isEqualTo(bus.getDriver().getId());
        var tomorrow = shuttleService.departuresOn(LocalDate.now().plusDays(1)).stream()
                .filter(trip -> trip.getSchedule().getId().equals(scheduleId)).findFirst().orElseThrow();
        assertThat(tomorrow.getDriverId()).isEqualTo(bus.getDriver().getId());
        assertThat(tomorrow.getVehicleId()).isEqualTo(bus.getId());
    }

    @Test
    void aVehicleTooSmallForTheSeatsSoldIsRefused() {
        DriverVehicle car = vehicle(4);
        assertThatThrownBy(() -> admin.setRegularCrew(route.id(), route.schedules().get(0).id(),
                new AssignDepartureRequest(car.getDriver().getId(), car.getId())))
                .isInstanceOf(ValidationException.class);
    }

    private DriverVehicle vehicle(int seats) {
        User user = new User();
        user.setEmail("crew-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(UserRole.DRIVER));
        userRepository.save(user);
        DriverVehicle vehicle = new DriverVehicle();
        vehicle.setDriver(driverProfileService.createFor(user));
        vehicle.setVehicleType(VehicleType.MINIBUS);
        vehicle.setStatus(VehicleStatus.ACTIVE);
        vehicle.setMake("Force");
        vehicle.setModel("Traveller");
        vehicle.setManufactureYear((short) 2024);
        vehicle.setSeatCapacity((short) seats);
        vehicle.setRegistrationNumber("WB" + System.nanoTime() % 100_000_000L);
        return vehicleRepository.save(vehicle);
    }

    private static StopRequest stop(String name, int offset) {
        return new StopRequest(name, new BigDecimal("22.57"), new BigDecimal("88.36"), offset);
    }
}

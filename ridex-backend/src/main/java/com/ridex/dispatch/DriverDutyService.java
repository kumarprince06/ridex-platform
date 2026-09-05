package com.ridex.dispatch;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.dispatch.dto.DutyRequest;
import com.ridex.dispatch.dto.LocationRequest;
import com.ridex.driver.DriverEligibility;
import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.location.DriverPresence;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DriverDutyService {

    private final DriverProfileRepository driverProfileRepository;
    private final DriverPresence driverPresence;
    private final DriverEligibility driverEligibility;

    @Transactional
    public void setDuty(String driverUserId, DutyRequest request) {
        DriverProfile driver = requireDriver(driverUserId);

        if (request.onDuty()) {
            // Approval, valid documents and an approved vehicle. Checked here rather than when
            // an offer arrives: a driver who cannot be placed should never enter the pool.
            String blocked = driverEligibility.blockedReason(driver.getId());
            if (blocked != null) {
                throw new ConflictException(blocked);
            }
            // Dispatch cannot offer to a driver it cannot place.
            if (request.latitude() == null || request.longitude() == null) {
                throw new ValidationException("A location is required to go on duty.");
            }
            driverPresence.report(driver.getId(), request.latitude(), request.longitude());
        } else {
            driverPresence.goOffDuty(driver.getId());
        }

        driver.setOnDuty(request.onDuty());
        driver.setDutyChangedAt(Instant.now());
        driverProfileRepository.save(driver);
    }

    /**
     * Redis only, and no transaction: this runs every few seconds per on-duty driver, and the
     * value is worthless within a minute.
     */
    public void reportLocation(String driverUserId, LocationRequest request) {
        DriverProfile driver = requireDriver(driverUserId);
        if (!driver.isOnDuty()) {
            // Off-duty pings would put a driver back in the dispatch pool they just left.
            return;
        }
        driverPresence.report(driver.getId(), request.latitude(), request.longitude());
    }

    private DriverProfile requireDriver(String driverUserId) {
        return driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."));
    }
}

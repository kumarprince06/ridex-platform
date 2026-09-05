package com.ridex.rating;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverProfile;
import com.ridex.rating.dto.RateRideRequest;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.shared.exception.ConflictException;
import com.ridex.shared.exception.ForbiddenException;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.shared.exception.ValidationException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RatingService {

    private final RideRatingRepository rideRatingRepository;
    private final RideRequestRepository rideRequestRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final DriverProfileRepository driverProfileRepository;

    @Transactional
    public void rate(String riderUserId, String rideId, RateRideRequest request) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new NotFoundException("That ride does not exist."));

        String riderId = riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."))
                .getId();

        // Checked rather than filtered in the query: rating somebody else's ride is a different
        // answer from rating a ride that does not exist, and the caller deserves to know which.
        if (!ride.getRider().getId().equals(riderId)) {
            throw new ForbiddenException("That ride belongs to another rider.");
        }

        if (ride.getStatus() != RideStatus.COMPLETED) {
            throw new ValidationException("Only a completed ride can be rated.");
        }

        String driverId = ride.getAssignedDriverId();
        if (driverId == null) {
            throw new ValidationException("That ride had no driver to rate.");
        }

        // The unique key on ride_id is the real guard; this only turns the constraint violation
        // into a sentence the app can show.
        if (rideRatingRepository.existsByRideId(rideId)) {
            throw new ConflictException("You have already rated this ride.");
        }

        RideRating rating = new RideRating();
        rating.setRideId(rideId);
        rating.setRiderId(riderId);
        rating.setDriverId(driverId);
        rating.setStars((short) request.stars());
        rating.setComment(request.comment());
        rideRatingRepository.save(rating);

        applyToDriverAverage(driverId, request.stars());
    }

    /**
     * Folds one rating into the driver's running average.
     *
     * ponytail: recomputed from the stored average and count rather than aggregating the ratings
     * table. It is one row read instead of a scan that grows forever, and the two can only drift
     * if a rating is deleted - which nothing does.
     */
    private void applyToDriverAverage(String driverId, int stars) {
        DriverProfile driver = driverProfileRepository.findById(driverId)
                .orElseThrow(() -> new NotFoundException("That driver no longer exists."));

        int previousCount = driver.getRatingCount();
        BigDecimal previousTotal = driver.getRating() == null
                ? BigDecimal.ZERO
                : driver.getRating().multiply(BigDecimal.valueOf(previousCount));

        int nextCount = previousCount + 1;
        BigDecimal nextAverage = previousTotal.add(BigDecimal.valueOf(stars))
                .divide(BigDecimal.valueOf(nextCount), 2, RoundingMode.HALF_UP);

        driver.setRating(nextAverage);
        driver.setRatingCount(nextCount);
    }
}

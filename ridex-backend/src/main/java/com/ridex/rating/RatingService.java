package com.ridex.rating;

import java.math.BigDecimal;
import java.time.Instant;
import java.math.RoundingMode;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.driver.DriverProfileRepository;
import com.ridex.driver.domain.DriverProfile;
import java.util.List;

import com.ridex.rating.dto.DriverRatingResponse;
import com.ridex.rating.dto.RateRideRequest;
import com.ridex.ride.RideRequestRepository;
import com.ridex.ride.domain.RideRequest;
import com.ridex.ride.domain.RideStatus;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.rider.domain.RiderProfile;
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
        // The driver may have rated first, in which case the row exists with only their half.
        RideRating rating = rideRatingRepository.findByRideId(rideId).orElseGet(() -> {
            RideRating fresh = new RideRating();
            fresh.setRideId(rideId);
            fresh.setRiderId(riderId);
            fresh.setDriverId(driverId);
            return fresh;
        });

        if (rating.getStars() != null) {
            throw new ConflictException("You have already rated this ride.");
        }

        rating.setStars((short) request.stars());
        rating.setComment(request.comment());
        rideRatingRepository.save(rating);

        applyToDriverAverage(driverId, request.stars());
    }

    /**
     * What riders have said about this driver.
     *
     * <p>Their own ratings only: a driver may read the stars they were given, and nobody else's.
     */
    @Transactional(readOnly = true)
    public List<DriverRatingResponse> receivedBy(String driverUserId) {
        String driverId = driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."))
                .getId();

        return rideRatingRepository.findTop50ByDriverIdOrderByCreatedAtDesc(driverId).stream()
                // Rows where only the driver rated carry no stars for them to read.
                .filter(rating -> rating.getStars() != null)
                .map(rating -> new DriverRatingResponse(rating.getRideId(), rating.getStars(),
                        rating.getComment(), rating.getCreatedAt()))
                .toList();
    }

    /**
     * The driver's side: what the rider was like to carry.
     *
     * <p>The same row as the rider's rating, because one ride produces at most one each way - and
     * the unique key on ride_id is what keeps a second opinion from appearing.
     */
    @Transactional
    public void rateRider(String driverUserId, String rideId, RateRideRequest request) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new NotFoundException("That ride does not exist."));

        String driverId = driverProfileRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new NotFoundException("No driver profile for this account."))
                .getId();

        if (!driverId.equals(ride.getAssignedDriverId())) {
            throw new ForbiddenException("That ride was driven by somebody else.");
        }
        if (ride.getStatus() != RideStatus.COMPLETED) {
            throw new ValidationException("Only a completed ride can be rated.");
        }

        RideRating rating = rideRatingRepository.findByRideId(rideId).orElseGet(() -> {
            RideRating fresh = new RideRating();
            fresh.setRideId(rideId);
            fresh.setRiderId(ride.getRider().getId());
            fresh.setDriverId(driverId);
            return fresh;
        });

        if (rating.getRiderRatedAt() != null) {
            throw new ConflictException("You have already rated this rider.");
        }

        rating.setRiderStars((short) request.stars());
        rating.setRiderComment(request.comment());
        rating.setRiderRatedAt(Instant.now());
        rideRatingRepository.save(rating);

        applyToRiderAverage(ride.getRider().getId(), request.stars());
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

        driver.setRating(average(driver.getRating(), driver.getRatingCount(), stars));
        driver.setRatingCount(driver.getRatingCount() + 1);
    }

    /** The same arithmetic from the other side. */
    private void applyToRiderAverage(String riderId, int stars) {
        RiderProfile rider = riderProfileRepository.findById(riderId)
                .orElseThrow(() -> new NotFoundException("That rider no longer exists."));

        rider.setRating(average(rider.getRating(), rider.getRatingCount(), stars));
        rider.setRatingCount(rider.getRatingCount() + 1);
    }

    /** One more star folded into a running mean, without reading the ratings table. */
    private static BigDecimal average(BigDecimal current, int count, int stars) {
        BigDecimal total = current == null
                ? BigDecimal.ZERO
                : current.multiply(BigDecimal.valueOf(count));

        return total.add(BigDecimal.valueOf(stars))
                .divide(BigDecimal.valueOf(count + 1L), 2, RoundingMode.HALF_UP);
    }
}

package com.ridex.places;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.places.dto.SavedPlaceRequest;
import com.ridex.places.dto.SavedPlaceResponse;
import com.ridex.rider.RiderProfileRepository;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.shared.exception.NotFoundException;

import lombok.RequiredArgsConstructor;

/**
 * A rider's own places.
 *
 * <p>Scoped to the caller everywhere: this is a list of where somebody lives and works, which is
 * the last thing that should be readable by whoever guesses an id.
 */
@Service
@RequiredArgsConstructor
public class SavedPlaceService {

    private final SavedPlaceRepository savedPlaceRepository;
    private final RiderProfileRepository riderProfileRepository;

    @Transactional(readOnly = true)
    public List<SavedPlaceResponse> mine(String riderUserId) {
        return savedPlaceRepository.findByRiderIdOrderByLabelAsc(requireRider(riderUserId).getId())
                .stream()
                .map(SavedPlaceResponse::of)
                .toList();
    }

    /**
     * Saves a place, or moves an existing one.
     *
     * <p>Saving "Home" twice is an edit rather than a second home: the label is how a rider refers
     * to it, and two of them is a list they cannot read.
     */
    @Transactional
    public SavedPlaceResponse save(String riderUserId, SavedPlaceRequest request) {
        RiderProfile rider = requireRider(riderUserId);
        String label = request.label().trim();

        SavedPlace place = savedPlaceRepository
                .findByRiderIdAndLabelIgnoreCase(rider.getId(), label)
                .orElseGet(() -> {
                    SavedPlace fresh = new SavedPlace();
                    fresh.setRider(rider);
                    return fresh;
                });

        place.setLabel(label);
        place.setAddress(request.address().trim());
        place.setLatitude(BigDecimal.valueOf(request.latitude()));
        place.setLongitude(BigDecimal.valueOf(request.longitude()));

        return SavedPlaceResponse.of(savedPlaceRepository.save(place));
    }

    @Transactional
    public void delete(String riderUserId, String placeId) {
        savedPlaceRepository
                .findByIdAndRiderId(placeId, requireRider(riderUserId).getId())
                .ifPresent(savedPlaceRepository::delete);
    }

    private RiderProfile requireRider(String riderUserId) {
        return riderProfileRepository.findByUserId(riderUserId)
                .orElseThrow(() -> new NotFoundException("No rider profile for this account."));
    }
}

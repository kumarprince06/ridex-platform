package com.ridex.places;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.EnumSet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.places.dto.SavedPlaceRequest;
import com.ridex.rider.RiderProfileService;

/** Places a rider named, and whose they are. */
@SpringBootTest
@Transactional
class SavedPlaceTest {

    @Autowired private SavedPlaceService savedPlaceService;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private UserRepository userRepository;

    @Test
    void aPlaceSavedOnceIsOfferedAgain() {
        String rider = newRider();

        savedPlaceService.save(rider, new SavedPlaceRequest("Home", "12 Park Street", 22.5726, 88.3639));

        assertThat(savedPlaceService.mine(rider)).singleElement().satisfies(place -> {
            assertThat(place.label()).isEqualTo("Home");
            assertThat(place.address()).isEqualTo("12 Park Street");
            // The coordinate is the point: an address without one cannot be booked to.
            assertThat(place.latitude()).isEqualTo(22.5726);
        });
    }

    @Test
    void savingTheSameLabelTwiceMovesItRatherThanDuplicatingIt() {
        String rider = newRider();
        savedPlaceService.save(rider, new SavedPlaceRequest("Home", "12 Park Street", 22.5726, 88.3639));

        savedPlaceService.save(rider, new SavedPlaceRequest("home", "9 Lake Road", 22.5150, 88.3400));

        // Two "Home" rows is a list a rider cannot read.
        assertThat(savedPlaceService.mine(rider)).singleElement()
                .extracting(place -> place.address()).isEqualTo("9 Lake Road");
    }

    @Test
    void oneRidersPlacesAreNeverAnothers() {
        String mine = newRider();
        String theirs = newRider();
        savedPlaceService.save(theirs, new SavedPlaceRequest("Work", "Sector V", 22.5760, 88.4330));

        // This is a list of where somebody lives and works.
        assertThat(savedPlaceService.mine(mine)).isEmpty();
    }

    @Test
    void removingAPlaceSomebodyElseOwnsDoesNothing() {
        String mine = newRider();
        String theirs = newRider();
        var place = savedPlaceService.save(theirs,
                new SavedPlaceRequest("Work", "Sector V", 22.5760, 88.4330));

        savedPlaceService.delete(mine, place.id());

        assertThat(savedPlaceService.mine(theirs)).hasSize(1);
    }

    private String newRider() {
        User user = new User();
        user.setEmail("places-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(UserRole.RIDER));
        userRepository.save(user);
        riderProfileService.createFor(user);
        return user.getId();
    }
}

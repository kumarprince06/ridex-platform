package com.ridex.rider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.ridex.auth.domain.User;
import com.ridex.rider.domain.RiderProfile;
import com.ridex.rider.dto.UpdateRiderProfileRequest;

import com.ridex.shared.exception.NotFoundException;

class RiderProfileServiceTest {

    private RiderProfileRepository repository;
    private RiderProfileService service;

    @BeforeEach
    void setUp() {
        repository = mock(RiderProfileRepository.class);
        service = new RiderProfileService(repository);
    }

    @Test
    void updatesTheIdentityFieldsOnTheAccount() {
        RiderProfile profile = profileFor("user-1");

        service.update("user-1", new UpdateRiderProfileRequest(" Asha ", " Verma ", " +91 98765 43210 "));

        User user = profile.getUser();
        assertThat(user.getFirstName()).isEqualTo("Asha");
        assertThat(user.getLastName()).isEqualTo("Verma");
        assertThat(user.getPhone()).isEqualTo("+91 98765 43210");
    }

    @Test
    void aBlankPhoneBecomesNullRatherThanAnEmptyString() {
        RiderProfile profile = profileFor("user-1");

        service.update("user-1", new UpdateRiderProfileRequest("Asha", "Verma", "   "));

        // uk_users_phone would let one empty string in and reject the second account that sent one.
        assertThat(profile.getUser().getPhone()).isNull();
    }

    @Test
    void anAccountWithNoProfileIsNotFound() {
        when(repository.findByUserId("user-9")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get("user-9")).isInstanceOf(NotFoundException.class);
    }

    private RiderProfile profileFor(String userId) {
        User user = new User();
        user.setId(userId);
        user.setEmail(userId + "@example.com");

        RiderProfile profile = new RiderProfile();
        profile.setUser(user);
        when(repository.findByUserId(userId)).thenReturn(Optional.of(profile));
        return profile;
    }
}

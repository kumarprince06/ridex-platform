package com.ridex.driver;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.EnumSet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.driver.dto.PayoutAccountRequest;
import com.ridex.shared.exception.NotFoundException;

/** Where a driver's money goes, and what the platform will say about it. */
@SpringBootTest
@Transactional
class PayoutAccountTest {

    @Autowired private DriverProfileService driverProfileService;
    @Autowired private UserRepository userRepository;

    @Test
    void aDriverWithNoAccountIsSaidToHaveNone() {
        // Not an empty string dressed up as an account: the payout screen has to be able to say
        // "nowhere to send this" rather than showing a blank destination.
        assertThat(driverProfileService.payoutAccount(newDriver()).set()).isFalse();
    }

    @Test
    void theStoredAccountComesBackMasked() {
        String userId = newDriver();

        var saved = driverProfileService.setPayoutAccount(userId,
                new PayoutAccountRequest("Prince Kumar", "123456789012", "hdfc0001234"));

        assertThat(saved.set()).isTrue();
        // Enough to recognise the account, not enough to read it over somebody's shoulder.
        assertThat(saved.accountNumberMasked()).isEqualTo("********9012");
        // Upper-cased on the way in: the RBI's codes are, and two spellings are two accounts.
        assertThat(saved.ifsc()).isEqualTo("HDFC0001234");
        assertThat(driverProfileService.payoutAccount(userId).accountHolder()).isEqualTo("Prince Kumar");
    }

    @Test
    void replacingTheAccountLeavesOnlyTheNewOne() {
        String userId = newDriver();
        driverProfileService.setPayoutAccount(userId,
                new PayoutAccountRequest("Prince Kumar", "123456789012", "HDFC0001234"));

        driverProfileService.setPayoutAccount(userId,
                new PayoutAccountRequest("Prince Kumar", "999988887777", "ICIC0004321"));

        // One destination at a time: an old account kept around is a second place money could go
        // from a stale screen.
        assertThat(driverProfileService.payoutAccount(userId).accountNumberMasked())
                .isEqualTo("********7777");
    }

    @Test
    void somebodyWithoutADriverProfileHasNoPayoutAccount() {
        User user = newUser(UserRole.RIDER);
        assertThatThrownBy(() -> driverProfileService.payoutAccount(user.getId()))
                .isInstanceOf(NotFoundException.class);
    }

    private String newDriver() {
        User user = newUser(UserRole.DRIVER);
        driverProfileService.createFor(user);
        return user.getId();
    }

    private User newUser(UserRole role) {
        User user = new User();
        user.setEmail("payout-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user);
    }
}

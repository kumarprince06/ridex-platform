package com.ridex.notification;

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

/** What a person is told, and whether they can find it again. */
@SpringBootTest
@Transactional
class NotificationFeedTest {

    @Autowired private Notifier notifier;
    @Autowired private NotificationFeedService feed;
    @Autowired private OutboxRepository outboxRepository;
    @Autowired private UserRepository userRepository;

    @Test
    void tellingSomebodySomethingPushesItAndKeepsIt() {
        String userId = newUser();

        notifier.notifyUser(userId, "SHUTTLE_BOOKED", "3A", "SHUTTLE_BOOKING", "booking-1");

        // The push, which is gone the moment it is swiped away...
        assertThat(outboxRepository.findAll())
                .filteredOn(message -> userId.equals(message.getRecipient()))
                .singleElement()
                .extracting(message -> message.getChannel()).isEqualTo(DeliveryChannel.PUSH);

        // ...and the row that survives it, in the words the person was actually sent.
        assertThat(feed.mine(userId)).singleElement().satisfies(row -> {
            assertThat(row.title()).isNotBlank();
            assertThat(row.body()).contains("3A");
            assertThat(row.referenceId()).isEqualTo("booking-1");
            assertThat(row.read()).isFalse();
        });
        assertThat(feed.unreadCount(userId)).isEqualTo(1);
    }

    @Test
    void openingTheScreenClearsTheDots() {
        String userId = newUser();
        notifier.notifyUser(userId, "RIDE_RECEIPT", "Total|INR 120.00", "RIDE", "ride-1");

        feed.markAllRead(userId);

        assertThat(feed.unreadCount(userId)).isZero();
        assertThat(feed.mine(userId)).singleElement()
                .extracting(row -> row.read()).isEqualTo(true);
    }

    @Test
    void oneFeedIsNeverAnother() {
        String mine = newUser();
        String theirs = newUser();
        notifier.notifyUser(theirs, "SHUTTLE_BOARDED", "2B", "SHUTTLE_BOOKING", "booking-2");

        // A feed carries where somebody was picked up and what they paid. It is not shared.
        assertThat(feed.mine(mine)).isEmpty();
    }

    private String newUser() {
        User user = new User();
        user.setEmail("feed-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(UserRole.RIDER));
        return userRepository.save(user).getId();
    }
}

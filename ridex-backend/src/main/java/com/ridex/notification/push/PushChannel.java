package com.ridex.notification.push;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.ridex.notification.DeliveryChannel;
import com.ridex.notification.NotificationChannel;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Push, through Expo.
 *
 * <p>ponytail: Expo's push service rather than Firebase directly. Both clients are Expo apps, so
 * one token reaches Android and iOS with no Firebase project, no service-account key and no APNs
 * certificate - which is the difference between push working today and push waiting on an account
 * somebody has to create. Swapping to FCM later changes the body of {@link #send} and nothing else.
 *
 * <p>The recipient on an outbox row is a user id, not a token: a person has as many devices as they
 * have signed in on, and which of those exist is a fact at send time, not at enqueue time.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PushChannel implements NotificationChannel {

    private final DeviceTokenRepository deviceTokenRepository;

    @Value("${app.push.expo-url:https://exp.host}")
    private String expoUrl;

    @Override
    public DeliveryChannel channel() {
        return DeliveryChannel.PUSH;
    }

    @Override
    public void send(String recipient, String subject, String body) {
        List<DeviceToken> devices = deviceTokenRepository.findByUserId(recipient);
        if (devices.isEmpty()) {
            // Not a failure: plenty of people never grant the permission, and retrying a message
            // for a person with no devices would fill the outbox with rows that can never send.
            log.debug("No device tokens for user {}; nothing to push", recipient);
            return;
        }

        List<Map<String, Object>> messages = devices.stream()
                .map(device -> Map.<String, Object>of(
                        "to", device.getToken(),
                        "title", subject,
                        "body", body,
                        // Wakes the app on Android rather than only showing a tray entry.
                        "priority", "high"))
                .toList();

        try {
            client().post()
                    .uri("/--/api/v2/push/send")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(messages)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException ex) {
            // Thrown on purpose: the outbox dispatcher retries, and a push that silently vanished
            // would be indistinguishable from one the person dismissed.
            throw new IllegalStateException("Expo push request failed", ex);
        }
    }

    private RestClient client() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);
        return RestClient.builder().requestFactory(factory).baseUrl(expoUrl).build();
    }
}

package com.ridex.payment.razorpay;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.ridex.payment.PaymentProvider;
import com.ridex.shared.exception.ProviderUnavailableException;
import com.ridex.shared.money.Money;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Razorpay, over its REST API.
 *
 * <p>ponytail: RestClient and HMAC rather than the Razorpay Java SDK. The SDK is four endpoints
 * behind a dependency that drags in its own JSON library and its own exception hierarchy, and this
 * class uses exactly those four. The same reason the maps providers call their APIs directly.
 *
 * <p>An "intent" here is a Razorpay <em>order</em>: the client opens checkout against the order id,
 * the customer pays, and the payment is only trusted once it is confirmed server-side or arrives on
 * a signed webhook. A client saying "it worked" is a client, not a payment.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RazorpayPaymentProvider implements PaymentProvider {

    private static final String HMAC = "HmacSHA256";

    private final RazorpayProperties properties;

    @Override
    public String name() {
        return "RAZORPAY";
    }

    @Override
    public ProviderPayment createPaymentIntent(Money amount, String reference, String idempotencyKey) {
        requireConfigured();

        // Razorpay takes minor units, which is what Money already holds - no conversion, and no
        // rounding to get wrong.
        Map<String, Object> body = Map.of(
                "amount", amount.amountMinor(),
                "currency", amount.currency().getCurrencyCode(),
                // Their receipt field is our idempotency handle: replaying the same one returns
                // the same order rather than opening a second one for the same trip.
                "receipt", idempotencyKey,
                "notes", Map.of("reference", reference));

        try {
            Map<?, ?> order = client().post()
                    .uri("/v1/orders")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (order == null || order.get("id") == null) {
                throw new ProviderUnavailableException("Razorpay returned no order.");
            }
            // "created" - nobody has paid yet. The status only moves on capture.
            return new ProviderPayment((String) order.get("id"), "PENDING", null);
        } catch (RestClientException ex) {
            throw new ProviderUnavailableException("Could not open a Razorpay order", ex);
        }
    }

    /**
     * Reads the payment back from Razorpay.
     *
     * <p>Takes a payment id, not an order id: checkout returns both, and only the payment carries a
     * captured status. Asked of Razorpay rather than believed from the client, because the client
     * is the one party with a reason to lie about it.
     */
    @Override
    public ProviderPayment confirmPayment(String providerPaymentId) {
        requireConfigured();

        try {
            Map<?, ?> payment = client().get()
                    .uri("/v1/payments/{id}", providerPaymentId)
                    .retrieve()
                    .body(Map.class);

            if (payment == null) {
                throw new ProviderUnavailableException("Razorpay returned no payment.");
            }
            String status = String.valueOf(payment.get("status"));
            return new ProviderPayment(
                    providerPaymentId,
                    mapStatus(status),
                    (String) payment.get("error_description"));
        } catch (RestClientException ex) {
            throw new ProviderUnavailableException("Could not read the Razorpay payment", ex);
        }
    }

    @Override
    public ProviderRefund refundPayment(String providerPaymentId, Money amount, String idempotencyKey) {
        requireConfigured();

        try {
            Map<?, ?> refund = client().post()
                    .uri("/v1/payments/{id}/refund", providerPaymentId)
                    .contentType(MediaType.APPLICATION_JSON)
                    // Their own idempotency header, so a retried refund does not pay twice.
                    .header("X-Razorpay-Idempotency-Key", idempotencyKey)
                    .body(Map.of("amount", amount.amountMinor()))
                    .retrieve()
                    .body(Map.class);

            if (refund == null || refund.get("id") == null) {
                throw new ProviderUnavailableException("Razorpay returned no refund.");
            }
            return new ProviderRefund((String) refund.get("id"),
                    mapStatus(String.valueOf(refund.get("status"))));
        } catch (RestClientException ex) {
            throw new ProviderUnavailableException("Could not refund the Razorpay payment", ex);
        }
    }

    /**
     * HMAC-SHA256 of the raw body against the webhook secret.
     *
     * <p>The raw body, byte for byte - parsing and re-serialising changes whitespace and key order,
     * and the signature is over what was sent, not over what it means.
     */
    @Override
    public boolean verifyWebhook(String payload, String signature) {
        if (properties.getWebhookSecret().isBlank() || signature == null) {
            // No secret configured means nothing can be verified, so nothing is trusted.
            return false;
        }

        try {
            Mac mac = Mac.getInstance(HMAC);
            mac.init(new SecretKeySpec(
                    properties.getWebhookSecret().getBytes(StandardCharsets.UTF_8), HMAC));
            byte[] expected = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));

            // Constant time: a byte-by-byte compare that returns early leaks the signature one
            // character at a time to anybody willing to send enough requests.
            return MessageDigest.isEqual(expected, HexFormat.of().parseHex(signature));
        } catch (Exception ex) {
            log.warn("Could not verify a Razorpay webhook signature", ex);
            return false;
        }
    }

    @Override
    public ProviderEvent parseWebhook(String payload) {
        throw new UnsupportedOperationException(
                "Razorpay webhooks are parsed by the webhook controller, which has the JSON mapper");
    }

    /** Their vocabulary to ours. Anything unrecognised is not treated as success. */
    private static String mapStatus(String razorpayStatus) {
        return switch (razorpayStatus) {
            case "captured", "processed" -> "SUCCEEDED";
            case "authorized", "created", "pending" -> "PENDING";
            case "failed" -> "FAILED";
            case "refunded" -> "REFUNDED";
            default -> "PENDING";
        };
    }

    private void requireConfigured() {
        if (!properties.isConfigured()) {
            throw new ProviderUnavailableException("Razorpay is not configured.");
        }
    }

    private RestClient client() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);

        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(properties.getBaseUrl())
                // Basic auth, key id as the user and the secret as the password - what their API
                // expects, and why the secret never leaves this process.
                .defaultHeader(HttpHeaders.AUTHORIZATION, basicAuth())
                .build();
    }

    private String basicAuth() {
        String pair = properties.getKeyId() + ':' + properties.getKeySecret();
        return "Basic " + java.util.Base64.getEncoder()
                .encodeToString(pair.getBytes(StandardCharsets.UTF_8));
    }
}

package com.ridex.payment.razorpay;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

@Component
@ConfigurationProperties(prefix = "app.razorpay")
@Getter
@Setter
public class RazorpayProperties {

    /** Public: it goes to the client to open checkout. Not a secret. */
    private String keyId = "";

    /** Signs every API call. Server side only, and never sent to a client. */
    private String keySecret = "";

    /**
     * Set by us when the webhook is created, not issued by Razorpay.
     *
     * <p>Separate from the key secret on purpose: a webhook is an unauthenticated POST from the
     * internet, and this is the only thing that says it came from Razorpay.
     */
    private String webhookSecret = "";

    private String baseUrl = "https://api.razorpay.com";

    public boolean isConfigured() {
        return !keyId.isBlank() && !keySecret.isBlank();
    }
}

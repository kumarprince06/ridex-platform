package com.ridex.maps.google;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

@Component
@ConfigurationProperties(prefix = "app.google.maps")
@Getter
@Setter
public class GoogleMapsProperties {
    private String apiKey = "";
    private String baseUrl = "https://maps.googleapis.com";

    /**
     * Calls allowed per day, counted by this application.
     *
     * <p>Here because Google will not do it: their Maps quotas read "Unlimited, Adjustable: No",
     * so a runaway loop would bill until somebody noticed. 300 a day is far more than development
     * uses and well inside the permanent free tier of 10,000 a month.
     *
     * <p>Zero means no ceiling.
     */
    private int dailyCallLimit = 300;
}

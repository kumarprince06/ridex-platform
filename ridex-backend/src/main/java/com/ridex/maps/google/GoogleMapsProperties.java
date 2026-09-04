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
}

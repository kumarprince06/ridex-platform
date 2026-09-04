package com.ridex.maps.google;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:ridex-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.google.maps.api-key=test-demo-key",
        "app.google.maps.base-url=https://maps.googleapis.com"
})
class GoogleMapsIntegrationTest {

    @Autowired
    private GoogleMapsProperties googleMapsProperties;

    @Test
    void propertiesAreBound() {
        assertThat(googleMapsProperties.getApiKey()).isEqualTo("test-demo-key");
        assertThat(googleMapsProperties.getBaseUrl()).isEqualTo("https://maps.googleapis.com");
    }
}

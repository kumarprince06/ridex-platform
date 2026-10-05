package com.ridex;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

// One Postgres and one Redis per test JVM. Every @MockitoBean variation is its own Spring context,
// and per-context containers would boot and migrate a database for each of them.
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    // Same image, database and role as docker-compose and CI, so migrations run as they do there.
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine")
            .withDatabaseName("ridex_platform_test")
            .withUsername("ridex_app");

    private static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    // destroyMethod "": a context closing must not stop containers the other contexts still use.
    // Testcontainers' reaper removes them when the JVM exits.
    @Bean(destroyMethod = "")
    @ServiceConnection
    PostgreSQLContainer postgres() {
        return POSTGRES;
    }

    @Bean(destroyMethod = "")
    @ServiceConnection(name = "redis")
    GenericContainer<?> redis() {
        return REDIS;
    }
}

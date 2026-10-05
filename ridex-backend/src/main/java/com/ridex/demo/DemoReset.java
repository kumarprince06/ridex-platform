package com.ridex.demo;

import org.flywaydb.core.Flyway;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Puts the public demo back to its seeded state every night. A schedule rather than an endpoint:
// an endpoint is one more thing on a public demo to protect, a schedule has no caller at all.
@Slf4j
@Component
@Profile("demo")
@RequiredArgsConstructor
public class DemoReset {

    private final Flyway flyway;
    private final DemoSeeder seeder;

    // Drop and re-migrate rather than delete row by row: the seeded state is exactly what a fresh
    // deployment has, with no hand-kept table list to fall behind the schema.
    // ponytail: requests landing during the few seconds of the reset fail; fine at 03:00 on a demo.
    @Scheduled(cron = "${app.demo.reset-cron}", zone = "Asia/Kolkata")
    public void reset() {
        log.warn("Resetting the demo database to its seeded state.");
        flyway.clean();
        flyway.migrate();
        seeder.seed();
    }
}

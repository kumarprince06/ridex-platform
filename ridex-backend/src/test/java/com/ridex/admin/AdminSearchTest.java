package com.ridex.admin;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.EnumSet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.rider.RiderProfileService;
import com.ridex.shuttle.AdminShuttleService;
import com.ridex.shuttle.dto.RouteRequest;

@SpringBootTest
class AdminSearchTest {

    @Autowired private AdminSearch search;
    @Autowired private UserRepository userRepository;
    @Autowired private RiderProfileService riderProfileService;
    @Autowired private AdminShuttleService admin;

    @Test
    void findsARiderByEmailAndARouteByCode() {
        String email = "findme-" + System.nanoTime() + "@example.com";
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(UserRole.RIDER));
        userRepository.save(user);
        riderProfileService.createFor(user);
        String code = "FIND" + System.nanoTime() % 100_000;
        admin.create(new RouteRequest(code, "Search test route", null, false));

        assertThat(search.search(email)).anyMatch(hit -> "RIDER".equals(hit.kind()) && email.equals(hit.detail()));
        assertThat(search.search(code)).anyMatch(hit -> "ROUTE".equals(hit.kind()) && code.equals(hit.detail()));
        assertThat(search.search("x")).isEmpty();
    }
}

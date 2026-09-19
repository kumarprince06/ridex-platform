package com.ridex.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.ridex.admin.dto.InviteStaffRequest;
import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.UserRole;
import com.ridex.shared.exception.ConflictException;

@SpringBootTest
class StaffServiceTest {

    @Autowired private StaffService staff;
    @Autowired private UserRepository userRepository;

    @Test
    void anInviteCreatesAWorkingAccountAndNobodyChangesTheirOwnAccess() {
        var boss = staff.invite(new InviteStaffRequest("boss-" + System.nanoTime() + "@example.com", "Boss", null, UserRole.SUPER_ADMIN));
        var agent = staff.invite(new InviteStaffRequest("agent-" + System.nanoTime() + "@example.com", "Agent", "One", UserRole.SUPPORT));

        assertThat(agent.temporaryPassword()).startsWith("Rx-").hasSize(15);
        assertThat(agent.staff().roles()).containsExactly("SUPPORT");

        var promoted = staff.changeRole(boss.staff().id(), agent.staff().id(), UserRole.OPS_ADMIN);
        assertThat(promoted.roles()).containsExactly("OPS_ADMIN");
        assertThatThrownBy(() -> staff.setEnabled(boss.staff().id(), boss.staff().id(), false))
                .isInstanceOf(ConflictException.class);

        var disabled = staff.setEnabled(boss.staff().id(), agent.staff().id(), false);
        assertThat(disabled.status()).isEqualTo("SUSPENDED");
        assertThat(userRepository.findById(agent.staff().id()).orElseThrow().getStatus().name()).isEqualTo("SUSPENDED");
    }
}

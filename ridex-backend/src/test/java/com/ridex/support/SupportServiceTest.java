package com.ridex.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.EnumSet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.ridex.auth.UserRepository;
import com.ridex.auth.domain.User;
import com.ridex.auth.domain.UserRole;
import com.ridex.auth.domain.UserStatus;
import com.ridex.shared.exception.NotFoundException;
import com.ridex.support.domain.TicketCategory;
import com.ridex.support.domain.TicketPriority;
import com.ridex.support.domain.TicketStatus;
import com.ridex.support.dto.CreateTicketRequest;
import com.ridex.support.dto.PostMessageRequest;
import com.ridex.support.dto.ResolveTicketRequest;

@SpringBootTest
@Transactional
class SupportServiceTest {

    @Autowired private SupportService supportService;
    @Autowired private UserRepository userRepository;

    @Test
    void bothRidersAndDriversCanRaiseTickets() {
        var riderTicket = supportService.raise(newUser(UserRole.RIDER), "RIDER",
                new CreateTicketRequest(TicketCategory.BILLING, "Charged twice",
                        "My card was charged twice for the same trip.", null));
        var driverTicket = supportService.raise(newUser(UserRole.DRIVER), "DRIVER",
                new CreateTicketRequest(TicketCategory.PAYOUT, "Payout missing",
                        "Last week's payout has not arrived in my account.", null));

        assertThat(riderTicket.raisedByRole()).isEqualTo("RIDER");
        assertThat(driverTicket.raisedByRole()).isEqualTo("DRIVER");
    }

    @Test
    void priorityComesFromTheCategoryRatherThanTheReporter() {
        String user = newUser(UserRole.RIDER);

        var safety = supportService.raise(user, "RIDER", new CreateTicketRequest(
                TicketCategory.SAFETY, "Driver was aggressive",
                "The driver shouted at me and drove dangerously.", null));
        var lostItem = supportService.raise(user, "RIDER", new CreateTicketRequest(
                TicketCategory.LOST_ITEM, "Left my umbrella",
                "I left a black umbrella on the back seat.", null));

        // A field the reporter controls means every ticket is urgent, and then none of them are.
        assertThat(safety.priority()).isEqualTo(TicketPriority.URGENT);
        assertThat(lostItem.priority()).isEqualTo(TicketPriority.NORMAL);
        assertThat(supportService.raise(user, "RIDER", new CreateTicketRequest(
                TicketCategory.FARE_DISPUTE, "Fare too high",
                "I was charged more than the quote said.", null)).priority())
                .isEqualTo(TicketPriority.HIGH);
    }

    @Test
    void aTicketIsCreatedWithItsFirstMessageAlreadyInIt() {
        var ticket = supportService.raise(newUser(UserRole.RIDER), "RIDER",
                new CreateTicketRequest(TicketCategory.APP_PROBLEM, "App crashes",
                        "The app closes whenever I open my trip history.", null));

        // A case with a status but no conversation is a queue entry, not support.
        assertThat(ticket.messages()).hasSize(1);
        assertThat(ticket.messages().get(0).body()).contains("closes whenever");
    }

    @Test
    void anAgentsInternalNoteIsNeverShownToThePersonWhoRaisedIt() {
        String user = newUser(UserRole.RIDER);
        String agent = newUser(UserRole.SUPPORT);
        var ticket = supportService.raise(user, "RIDER", new CreateTicketRequest(
                TicketCategory.REFUND_REQUEST, "Refund please",
                "I was charged for a ride I cancelled before it started.", null));

        supportService.agentReply(agent, ticket.id(),
                new PostMessageRequest("Checked the ledger, looks like a genuine double charge.", true));

        assertThat(supportService.get(user, ticket.id()).messages()).hasSize(1);
        assertThat(supportService.viewAsAgent(ticket.id()).messages()).hasSize(2);
    }

    @Test
    void anInternalNoteDoesNotStopTheResponseClock() {
        String user = newUser(UserRole.RIDER);
        String agent = newUser(UserRole.SUPPORT);
        var ticket = supportService.raise(user, "RIDER", new CreateTicketRequest(
                TicketCategory.BILLING, "Wrong amount", "The amount does not match my receipt.", null));

        supportService.agentReply(agent, ticket.id(), new PostMessageRequest("Looking into it", true));
        assertThat(supportService.viewAsAgent(ticket.id()).firstResponseAt()).isNull();

        // The SLA is measured on a reply the person waiting can actually read.
        supportService.agentReply(agent, ticket.id(),
                new PostMessageRequest("We have refunded the difference.", false));
        assertThat(supportService.viewAsAgent(ticket.id()).firstResponseAt()).isNotNull();
    }

    @Test
    void theOwnerReplyingReopensATicketThatWasWaitingOnThem() {
        String user = newUser(UserRole.RIDER);
        String agent = newUser(UserRole.SUPPORT);
        var ticket = supportService.raise(user, "RIDER", new CreateTicketRequest(
                TicketCategory.OTHER, "Question", "How do I change my phone number?", null));

        supportService.agentReply(agent, ticket.id(),
                new PostMessageRequest("You can change it in Settings.", false));
        assertThat(supportService.viewAsAgent(ticket.id()).status())
                .isEqualTo(TicketStatus.AWAITING_REPLY);

        supportService.reply(user, "RIDER", ticket.id(),
                new PostMessageRequest("That did not work for me.", null));

        assertThat(supportService.viewAsAgent(ticket.id()).status())
                .isEqualTo(TicketStatus.IN_PROGRESS);
    }

    @Test
    void resolvingPostsTheExplanationIntoTheThread() {
        String user = newUser(UserRole.RIDER);
        String agent = newUser(UserRole.SUPPORT);
        var ticket = supportService.raise(user, "RIDER", new CreateTicketRequest(
                TicketCategory.FARE_DISPUTE, "Overcharged", "The fare was higher than quoted.", null));

        supportService.resolve(agent, ticket.id(),
                new ResolveTicketRequest("Refunded the difference of INR 28.40 to your original method."));

        var asOwner = supportService.get(user, ticket.id());
        // Not a silent status change: the person waiting reads why.
        assertThat(asOwner.status()).isEqualTo(TicketStatus.RESOLVED);
        assertThat(asOwner.messages()).anyMatch(message -> message.body().contains("28.40"));
    }

    @Test
    void somebodyElsesTicketIsNotReadable() {
        String owner = newUser(UserRole.RIDER);
        String stranger = newUser(UserRole.RIDER);
        var ticket = supportService.raise(owner, "RIDER", new CreateTicketRequest(
                TicketCategory.ACCOUNT, "Cannot sign in", "My password reset never arrives.", null));

        assertThatThrownBy(() -> supportService.get(stranger, ticket.id()))
                .isInstanceOf(NotFoundException.class);
    }

    private String newUser(UserRole role) {
        User user = new User();
        user.setEmail("support-" + System.nanoTime() + "@example.com");
        user.setPasswordHash("irrelevant");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(EnumSet.of(role));
        return userRepository.save(user).getId();
    }
}

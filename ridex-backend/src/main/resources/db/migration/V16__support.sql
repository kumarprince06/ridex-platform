-- Support tickets and their conversation.
--
-- Either side can raise one, about a trip, a payment, a person, or nothing in particular. The
-- thread is the ticket: a case with a status but no conversation is a queue entry, not support.

CREATE TABLE support_tickets (
    id               VARCHAR(26)  PRIMARY KEY,

    -- Who raised it. Not "rider_id": a driver raises tickets too, and against riders.
    raised_by_user_id VARCHAR(26) NOT NULL,
    raised_by_role   VARCHAR(20)  NOT NULL,

    category         VARCHAR(30)  NOT NULL,
    priority         VARCHAR(20)  NOT NULL DEFAULT 'NORMAL',
    status           VARCHAR(20)  NOT NULL DEFAULT 'OPEN',

    subject          VARCHAR(160) NOT NULL,

    -- What it is about. Nullable because "the app crashed" is about nothing in particular.
    ride_id          VARCHAR(26),
    -- Who it is against, when it is about a person rather than a thing.
    against_user_id  VARCHAR(26),

    assigned_to_user_id VARCHAR(26),

    -- Set when an agent first replies, which is the number a support SLA is actually measured on.
    first_response_at TIMESTAMPTZ,
    resolved_at      TIMESTAMPTZ,
    resolution       VARCHAR(1000),

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_support_tickets_raiser FOREIGN KEY (raised_by_user_id) REFERENCES users (id),
    CONSTRAINT fk_support_tickets_against FOREIGN KEY (against_user_id) REFERENCES users (id),
    CONSTRAINT fk_support_tickets_ride FOREIGN KEY (ride_id) REFERENCES ride_requests (id),
    CONSTRAINT fk_support_tickets_assignee FOREIGN KEY (assigned_to_user_id) REFERENCES users (id)
);

CREATE INDEX idx_support_tickets_raiser ON support_tickets (raised_by_user_id, created_at DESC);
CREATE INDEX idx_support_tickets_queue ON support_tickets (status, priority, created_at);
CREATE INDEX idx_support_tickets_ride ON support_tickets (ride_id);

-- The conversation. Append-only: an edited support history is not a history.
CREATE TABLE support_messages (
    id              VARCHAR(26)  PRIMARY KEY,
    ticket_id       VARCHAR(26)  NOT NULL,

    author_user_id  VARCHAR(26),
    author_role     VARCHAR(20)  NOT NULL,

    body            VARCHAR(4000) NOT NULL,

    -- Notes an agent writes for other agents. Never shown to the person who raised the ticket,
    -- which is why it is a column here rather than a separate table nobody joins.
    internal        BOOLEAN      NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_support_messages_ticket FOREIGN KEY (ticket_id)
        REFERENCES support_tickets (id) ON DELETE CASCADE,
    CONSTRAINT fk_support_messages_author FOREIGN KEY (author_user_id) REFERENCES users (id)
);

CREATE INDEX idx_support_messages_ticket ON support_messages (ticket_id, created_at);

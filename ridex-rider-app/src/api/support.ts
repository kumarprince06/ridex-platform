import { request } from './client';

export type TicketCategory = {
  /** The enum the server routes on. The label is what a person reads. */
  code: string;
  label: string;
};

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'AWAITING_REPLY' | 'RESOLVED' | 'CLOSED';

export type TicketMessage = {
  id: string;
  authorRole: string;
  fromSupport: boolean;
  body: string;
  /** An agent's note to other agents. Never returned to the person who raised the ticket. */
  internal: boolean;
  createdAt: string;
};

export type Ticket = {
  id: string;
  category: string;
  priority: string;
  status: TicketStatus;
  subject: string;
  rideId: string | null;
  raisedByRole: string;
  raisedByEmail: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
  messages: TicketMessage[];
};

const TICKETS = '/api/v1/support/tickets';

/** Scoped to the caller's role by the server: a rider is never offered "Payout". */
export function listCategories() {
  return request<TicketCategory[]>(`${TICKETS}/categories`);
}

export function raiseTicket(ticket: {
  category: string;
  subject: string;
  message: string;
  rideId?: string;
}) {
  return request<Ticket>(TICKETS, { method: 'POST', body: ticket });
}

export function myTickets() {
  return request<Ticket[]>(TICKETS);
}

export function getTicket(ticketId: string) {
  return request<Ticket>(`${TICKETS}/${ticketId}`);
}

export function replyToTicket(ticketId: string, body: string) {
  return request<Ticket>(`${TICKETS}/${ticketId}/messages`, { method: 'POST', body: { body } });
}

/** OPEN and IN_PROGRESS read as one thing to the person waiting: somebody is looking at it. */
export function isOpen(status: TicketStatus): boolean {
  return status !== 'RESOLVED' && status !== 'CLOSED';
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'Being looked at',
  AWAITING_REPLY: 'Waiting on you',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export function statusLabel(status: TicketStatus): string {
  return STATUS_LABELS[status] ?? status;
}

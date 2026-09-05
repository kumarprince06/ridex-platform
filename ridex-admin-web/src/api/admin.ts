import { request } from './client';

/**
 * Ten rows, because a console table is read in one glance and the operator picks a larger page
 * when they want one. The server clamps anything above 100 - an unbounded ?size= is a table scan.
 */
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100] as const;

export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type Dashboard = {
  ridersTotal: number;
  driversTotal: number;
  driversAwaitingReview: number;
  driversOnDuty: number;
  ridesToday: number;
  ridesInProgress: number;
  ridesCompletedToday: number;
  currency: string;
  grossFaresTodayMinor: number;
  ridesByStatus: Record<string, number>;
};

export type OnboardingStatus =
  | 'REGISTERED' | 'PROFILE_SUBMITTED' | 'DOCUMENTS_SUBMITTED'
  | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type AdminRider = {
  riderId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
  joinedAt: string;
};

export type AdminDriver = {
  driverId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  onboardingStatus: OnboardingStatus;
  onDuty: boolean;
  rating: number | null;
  ratingCount: number;
  joinedAt: string;
};

export type AdminTrip = {
  rideId: string;
  status: string;
  rideTypeCode: string;
  riderEmail: string;
  driverEmail: string | null;
  pickupAddress: string | null;
  destinationAddress: string | null;
  currency: string;
  quotedFareMinor: number;
  finalFareMinor: number | null;
  requestedAt: string;
};

export type AuditEntry = {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  ipAddress: string | null;
  occurredAt: string;
};

export function getDashboard() {
  return request<Dashboard>('/api/v1/admin/dashboard');
}

export function listRiders(q = '', page = 0, size = DEFAULT_PAGE_SIZE) {
  return request<Page<AdminRider>>(
    `/api/v1/admin/riders?q=${encodeURIComponent(q)}&page=${page}&size=${size}`,
  );
}

export function listDrivers(status?: OnboardingStatus, q = '', page = 0, size = DEFAULT_PAGE_SIZE) {
  const query = new URLSearchParams({ q, page: String(page), size: String(size) });
  if (status) query.set('status', status);
  return request<Page<AdminDriver>>(`/api/v1/admin/drivers?${query}`);
}

export function listTrips(status?: string, page = 0, size = DEFAULT_PAGE_SIZE) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set('status', status);
  return request<Page<AdminTrip>>(`/api/v1/admin/trips?${query}`);
}

export function listAuditLog(page = 0, size = DEFAULT_PAGE_SIZE) {
  return request<Page<AuditEntry>>(`/api/v1/admin/audit?page=${page}&size=${size}`);
}

export function driversAwaitingReview() {
  return request<
    { driverId: string; email: string; status: OnboardingStatus; eligibleToDrive: boolean }[]
  >('/api/v1/admin/drivers/awaiting-review');
}

export function approveDriver(driverId: string) {
  return request(`/api/v1/admin/drivers/${driverId}/approve`, { method: 'POST' });
}

/** A reason is required by the API, not just by the form. */
export function rejectDriver(driverId: string, reason: string) {
  return request(`/api/v1/admin/drivers/${driverId}/reject`, { method: 'POST', body: { reason } });
}

export function suspendDriver(driverId: string, reason: string) {
  return request(`/api/v1/admin/drivers/${driverId}/suspend`, { method: 'POST', body: { reason } });
}

/** Minor units to a display string. The currency comes from the response, never assumed. */
export function formatMoney(amountMinor: number, currency: string): string {
  return `${currency} ${(amountMinor / 100).toFixed(2)}`;
}

export type PaymentStatus =
  | 'CREATED' | 'REQUIRES_ACTION' | 'PROCESSING' | 'SUCCEEDED'
  | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export type AdminPayment = {
  id: string;
  tripId: string;
  riderEmail: string;
  method: string;
  status: PaymentStatus;
  currency: string;
  grossAmountMinor: number;
  discountAmountMinor: number;
  netAmountMinor: number;
  createdAt: string;
  paidAt: string | null;
};

export type Setting = {
  key: string;
  value: string;
  label: string;
  description: string | null;
  valueType: string;
  minValue: number | null;
  maxValue: number | null;
  updatedAt: string;
};

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'AWAITING_REPLY' | 'RESOLVED' | 'CLOSED';

export type TicketMessage = {
  id: string;
  authorRole: string;
  fromSupport: boolean;
  body: string;
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

export function listPayments(status?: PaymentStatus, page = 0, size = DEFAULT_PAGE_SIZE) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set('status', status);
  return request<Page<AdminPayment>>(`/api/v1/admin/payments?${query}`);
}

export function listSettings() {
  return request<Setting[]>('/api/v1/admin/settings');
}

/** Bounded server-side, so a typo cannot set a reward to a million. */
export function updateSetting(key: string, value: string) {
  return request<Setting>(`/api/v1/admin/settings/${key}`, { method: 'PUT', body: { value } });
}

export function listTickets(status?: TicketStatus, page = 0, size = DEFAULT_PAGE_SIZE) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set('status', status);
  return request<Page<Ticket>>(`/api/v1/admin/support/tickets?${query}`);
}

export function getTicket(ticketId: string) {
  return request<Ticket>(`/api/v1/admin/support/tickets/${ticketId}`);
}

export function replyToTicket(ticketId: string, body: string, internal: boolean) {
  return request<Ticket>(`/api/v1/admin/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: { body, internal },
  });
}

export function resolveTicket(ticketId: string, resolution: string) {
  return request<Ticket>(`/api/v1/admin/support/tickets/${ticketId}/resolve`, {
    method: 'POST',
    body: { resolution },
  });
}

export type DayPoint = {
  date: string;
  ridesRequested: number;
  ridesCompleted: number;
  grossMinor: number;
};

export type Analytics = {
  currency: string;
  days: DayPoint[];
  ridesByStatus: { label: string; count: number }[];
  paymentsByMethod: { label: string; count: number }[];
};

export function getAnalytics(days = 14) {
  return request<Analytics>(`/api/v1/admin/analytics?days=${days}`);
}

/* ------------------------------------------------------------------ payouts */

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';

export type Payout = {
  id: string;
  driverId: string;
  driverEmail: string;
  currency: string;
  amountMinor: number;
  status: PayoutStatus;
  periodStart: string;
  periodEnd: string;
  reference: string | null;
  failureReason: string | null;
  createdAt: string;
  settledAt: string | null;
};

export function listPayouts(status?: PayoutStatus, page = 0, size = DEFAULT_PAGE_SIZE) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set('status', status);
  return request<Page<Payout>>(`/api/v1/admin/payouts?${query}`);
}

/** One payout per driver with money owed. Safe to run twice - the second run creates nothing. */
export function runPayoutBatch() {
  return request<Payout[]>('/api/v1/admin/payouts/run', { method: 'POST' });
}

export function sendPayout(payoutId: string) {
  return request<Payout>(`/api/v1/admin/payouts/${payoutId}/send`, { method: 'POST' });
}

export function settlePayout(payoutId: string, reference: string) {
  return request<Payout>(`/api/v1/admin/payouts/${payoutId}/settle`, {
    method: 'POST',
    body: { reference },
  });
}

export function failPayout(payoutId: string, reason: string) {
  return request<Payout>(`/api/v1/admin/payouts/${payoutId}/fail`, {
    method: 'POST',
    body: { reason },
  });
}

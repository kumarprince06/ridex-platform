import { request, requestBlob } from './client';

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
  platformFeeTodayMinor: number;
  openSupportCases: number;
  failedPaymentsThisWeek: number;
  failedPayouts: number;
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

/** One on-duty driver with a live position. Drivers whose phone stopped reporting are not listed. */
export type LiveDriver = {
  driverId: string;
  name: string;
  vehicle: string | null;
  registrationNumber: string | null;
  latitude: number;
  longitude: number;
  onTrip: boolean;
};

export type FareLine = { type: string; label: string; amountMinor: number };

export type PaymentDetail = {
  payment: AdminPayment;
  provider: string;
  /** The gateway's own id - what support quotes when opening a ticket with the provider. */
  providerPaymentId: string | null;
  failureReason: string | null;
  events: {
    id: string;
    provider: string;
    providerEventId: string;
    eventType: string;
    receivedAt: string;
  }[];
};

export type TripDetail = {
  trip: AdminTrip;
  tripId: string | null;
  quotedDistanceMeters: number | null;
  actualDistanceMeters: number | null;
  actualDurationSeconds: number | null;
  waitingSeconds: number;
  cancellationReason: string | null;
  quotedLines: FareLine[];
  chargedLines: FareLine[];
  timeline: {
    fromStatus: string | null;
    toStatus: string;
    actorType: string;
    actorId: string | null;
    reason: string | null;
    occurredAt: string;
  }[];
};

export type RiderDetail = {
  rider: AdminRider;
  pointsBalance: number;
  currency: string;
  outstandingDuesMinor: number;
  recentRides: AdminTrip[];
};

export function getPayment(paymentId: string) {
  return request<PaymentDetail>(`/api/v1/admin/payments/${paymentId}`);
}

export function getTrip(rideId: string) {
  return request<TripDetail>(`/api/v1/admin/trips/${rideId}`);
}

export function getRider(riderId: string) {
  return request<RiderDetail>(`/api/v1/admin/riders/${riderId}`);
}

export function getLiveDrivers() {
  return request<LiveDriver[]>('/api/v1/admin/drivers/live');
}

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

export type StaffMember = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export function listStaff() {
  return request<StaffMember[]>('/api/v1/admin/staff');
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

export type PaymentStatus =
  | 'CREATED' | 'REQUIRES_ACTION' | 'PROCESSING' | 'SUCCEEDED'
  | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export type AdminPayment = {
  id: string;
  /** Null for a shuttle seat. Exactly one of the two references is set. */
  tripId: string | null;
  shuttleBookingId: string | null;
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

export type RideFare = {
  rideTypeId: string;
  code: string;
  displayName: string;
  seatCapacity: number;
  active: boolean;
  currency: string;
  baseFareMinor: number | null;
  perKmMinor: number | null;
  perMinuteMinor: number | null;
  minimumFareMinor: number | null;
  freeWaitingSeconds: number | null;
  perWaitingMinuteMinor: number | null;
  validFrom: string | null;
};

export function listRideFares() {
  return request<RideFare[]>('/api/v1/admin/ride-fares');
}

/** A new fare from now on. The old one is closed, not edited, so past quotes still add up. */
export function changeRideFare(
  rideTypeId: string,
  fare: {
    baseFareMinor: number;
    perKmMinor: number;
    perMinuteMinor: number;
    minimumFareMinor: number;
    freeWaitingSeconds: number;
    perWaitingMinuteMinor: number;
  },
) {
  return request<RideFare>(`/api/v1/admin/ride-fares/${rideTypeId}`, { method: 'PUT', body: fare });
}

/** A refund on a payment, paid to the rider as points. Never more in total than was paid. */
export function refundAsPoints(paymentId: string, amountMinor: number, reason: string) {
  return request<{ refundId: string; amountMinor: number }>(`/api/v1/admin/payments/${paymentId}/refund`, {
    method: 'POST',
    body: { amountMinor, reason },
  });
}

/** Calls a departure off: every rider gets the whole fare back as points and is told. */
export function cancelDeparture(shuttleTripId: string, reason: string) {
  return request<{ seatsCancelled: number }>(`/api/v1/admin/shuttle/departures/${shuttleTripId}/cancel`, {
    method: 'POST',
    body: { reason },
  });
}

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

export type LegalDocument = { slug: string; title: string; body: string; updatedAt: string };

export function listLegalDocuments() {
  return request<LegalDocument[]>('/api/v1/admin/legal');
}

export function updateLegalDocument(slug: string, title: string, body: string) {
  return request<LegalDocument>(`/api/v1/admin/legal/${slug}`, { method: 'PUT', body: { title, body } });
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
  /** Where this money is going, masked. Null when the driver has not told us yet. */
  payoutAccountHolder: string | null;
  payoutAccountMasked: string | null;
  payoutIfsc: string | null;
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

/* ------------------------------------------------------------------ shuttle */

export type RouteStop = {
  id: string;
  sequence: number;
  name: string;
  latitude: string;
  longitude: string;
  offsetMinutes: number;
};

export type RouteFare = {
  id: string;
  fromStopId: string;
  toStopId: string;
  currency: string;
  fareMinor: number;
};

export type RouteSchedule = {
  id: string;
  departureTime: string;
  daysOfWeek: string;
  seatCapacity: number;
  /** Seats abreast. Four is a minibus, three a 2+1 coach - it decides whether "4D" exists. */
  seatsPerRow: number;
  active: boolean;
  /** The regular crew; null when each day is crewed on the Today board. */
  driverId: string | null;
  vehicleId: string | null;
  crew: string | null;
};

export type ShuttleRoute = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  stops: RouteStop[];
  fares: RouteFare[];
  schedules: RouteSchedule[];
};

/**
 * A route in the list: counts, not contents. The full route is three more queries per row, which
 * the list does not need and a page of a hundred cannot afford.
 */
export type ShuttleRouteSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  stopCount: number;
  fareCount: number;
  activeDepartures: number;
};

const SHUTTLE = '/api/v1/admin/shuttle/routes';

/** One departure as it is actually running, with every seat ever sold on it. */
export type Departure = {
  shuttleTripId: string;
  scheduleId: string;
  routeName: string;
  departsAt: string;
  seatCapacity: number;
  seatsSold: number;
  seatsCancelled: number;
  boarded: number;
  driverId: string | null;
  driverName: string | null;
  vehicle: string | null;
  registrationNumber: string | null;
  runStatus: 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
  currentStop: string | null;
  delayMinutes: number;
  seats: {
    bookingId: string;
    seatLabel: string;
    riderName: string;
    riderEmail: string;
    boardingStopName: string | null;
    alightingStopName: string | null;
    status: string;
    paymentStatus: string;
    boardedAt: string | null;
  }[];
};

export function listDepartures(date: string) {
  return request<Departure[]>(`/api/v1/admin/shuttle/departures?date=${date}`);
}

export function listRoutes(page = 0, size = DEFAULT_PAGE_SIZE) {
  return request<Page<ShuttleRouteSummary>>(`${SHUTTLE}?page=${page}&size=${size}`);
}

export function getRoute(routeId: string) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}`);
}

export function createRoute(route: {
  code: string;
  name: string;
  description?: string;
  active: boolean;
}) {
  return request<ShuttleRoute>(SHUTTLE, { method: 'POST', body: route });
}

/** The code is not editable server-side: it is printed on tickets and quoted in operations. */
export function updateRoute(
  routeId: string,
  route: { code: string; name: string; description?: string; active: boolean },
) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}`, { method: 'PUT', body: route });
}

type StopInput = { name: string; latitude: number; longitude: number; offsetMinutes: number };

/** Appends, or inserts straight after the stop at position {@code after} (0 for the front). */
export function addStop(routeId: string, stop: StopInput, after?: number) {
  const query = after === undefined ? '' : `?after=${after}`;
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}/stops${query}`, { method: 'POST', body: stop });
}

export function updateStop(routeId: string, stopId: string, stop: StopInput) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}/stops/${stopId}`, { method: 'PUT', body: stop });
}

export type PassPricing = {
  monthlyPriceMinor: number | null;
  onSale: boolean;
  ridesPerMonth: number | null;
  maxActivePasses: number | null;
  activePasses: number;
  plans: {
    plan: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
    label: string;
    months: number;
    durationDays: number;
    priceMinor: number | null;
    discountPercent: number;
    activePasses: number;
  }[];
};

export type RoutePassSummary = {
  routeId: string;
  routeName: string;
  onSale: boolean;
  monthlyPriceMinor: number | null;
  activePasses: number;
};

export type SoldPass = {
  id: string;
  riderName: string;
  riderEmail: string;
  routeName: string;
  plan: string;
  startsOn: string;
  endsOn: string;
  ridesUsed: number;
  currency: string;
  pricePaidMinor: number;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | string;
  boughtAt: string;
};

export function passOverview() {
  return request<RoutePassSummary[]>('/api/v1/admin/shuttle/passes/overview');
}

export function listSoldPasses(page = 0, size = DEFAULT_PAGE_SIZE) {
  return request<Page<SoldPass>>(`/api/v1/admin/shuttle/passes?page=${page}&size=${size}`);
}

export function getPassPricing(routeId: string) {
  return request<PassPricing>(`${SHUTTLE}/${routeId}/passes`);
}

export function setPassPricing(
  routeId: string,
  pricing: {
    monthlyPriceMinor: number;
    quarterlyDiscountPercent: number;
    halfYearlyDiscountPercent: number;
    yearlyDiscountPercent: number;
    onSale: boolean;
    ridesPerMonth: number;
    maxActivePasses: number | null;
  },
) {
  return request<PassPricing>(`${SHUTTLE}/${routeId}/passes`, { method: 'PUT', body: pricing });
}

/** The driver and vehicle a departure time normally runs with; upcoming uncrewed days get them too. */
export function setRegularCrew(routeId: string, scheduleId: string, driverId: string, vehicleId: string) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}/schedules/${scheduleId}/crew`, {
    method: 'PUT',
    body: { driverId, vehicleId },
  });
}

export function clearRegularCrew(routeId: string, scheduleId: string) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}/schedules/${scheduleId}/crew`, { method: 'DELETE' });
}

/** The same route the other way: stops reversed, fares mirrored, a departure at each time. */
export function createReturnRoute(routeId: string, departureTimes: string[]) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}/return`, {
    method: 'POST',
    body: { departureTimes: departureTimes.map((time) => (time.length === 5 ? `${time}:00` : time)) },
  });
}

/** Only a route nobody has booked or bought a pass on. */
export function deleteRoute(routeId: string) {
  return request<void>(`${SHUTTLE}/${routeId}`, { method: 'DELETE' });
}

/** Its fares go with it. Refused for a stop anyone has booked. */
export function removeStop(routeId: string, stopId: string) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}/stops/${stopId}`, { method: 'DELETE' });
}

export function setFare(
  routeId: string,
  fare: { fromStopId: string; toStopId: string; currency: string; fareMinor: number },
) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}/fares`, { method: 'PUT', body: fare });
}

/**
 * The whole fare table in one save.
 *
 * Replaces rather than merges: the matrix shows every leg, so what it sends is the complete
 * answer, and a cell the operator cleared is a leg that is no longer sold.
 */
export function setFareMatrix(
  routeId: string,
  currency: string,
  fares: { fromStopId: string; toStopId: string; fareMinor: number }[],
) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}/fares/matrix`, {
    method: 'PUT',
    body: { currency, fares },
  });
}

export function removeFare(routeId: string, fareId: string) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}/fares/${fareId}`, { method: 'DELETE' });
}

export function addSchedule(
  routeId: string,
  schedule: {
    departureTime: string;
    daysOfWeek: string;
    seatCapacity: number;
    seatsPerRow: number;
    active: boolean;
  },
) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}/schedules`, {
    method: 'POST',
    body: schedule,
  });
}

/**
 * Puts a driver and their vehicle on one dated departure.
 *
 * The departure only exists once a seat has been sold on it - it is materialised on first booking,
 * so an unbooked route does not fill the table with a row for every day of the year.
 */
export function assignDeparture(
  scheduleId: string,
  serviceDate: string,
  driverId: string,
  vehicleId: string,
) {
  return request<void>(
    `${SHUTTLE}/schedules/${scheduleId}/departures/${serviceDate}/assign`,
    { method: 'POST', body: { driverId, vehicleId } },
  );
}

export function updateSchedule(
  routeId: string,
  scheduleId: string,
  schedule: {
    departureTime: string;
    daysOfWeek: string;
    seatCapacity: number;
    seatsPerRow: number;
    active: boolean;
  },
) {
  return request<ShuttleRoute>(`${SHUTTLE}/${routeId}/schedules/${scheduleId}`, {
    method: 'PUT',
    body: schedule,
  });
}

/* ------------------------------------------------------------------ places */

export type Place = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

/**
 * Place search, proxied through the backend.
 *
 * Not called from the browser directly: the free geocoder's usage policy needs an identifying
 * User-Agent, which a page cannot set, and the proxy is also what lets a Google key be swapped in
 * without touching this file.
 */
export function searchPlaces(query: string, limit = 6) {
  return request<Place[]>(
    `/api/v1/maps/search?query=${encodeURIComponent(query)}&limit=${limit}`,
  );
}

/* ------------------------------------------------------------------ driver documents and vehicles */

export type DocumentType =
  | 'DRIVING_LICENCE' | 'IDENTITY_PROOF' | 'ADDRESS_PROOF'
  | 'VEHICLE_REGISTRATION' | 'VEHICLE_INSURANCE' | 'BACKGROUND_CHECK';

export type DocumentStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type DriverDocument = {
  id: string;
  documentType: DocumentType;
  status: DocumentStatus;
  expiresAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
};

export type VehicleType =
  | 'BICYCLE' | 'SCOOTER' | 'MOTORCYCLE' | 'E_RICKSHAW' | 'AUTO_RICKSHAW'
  | 'HATCHBACK' | 'SEDAN' | 'MPV' | 'SUV' | 'VAN' | 'PICKUP' | 'MINIBUS' | 'BUS';

export type VehicleStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';

export type Vehicle = {
  id: string;
  vehicleType: VehicleType;
  status: VehicleStatus;
  make: string;
  model: string;
  manufactureYear: number;
  color: string | null;
  seatCapacity: number;
  registrationNumber: string;
  createdAt: string;
};

export function getDriver(driverId: string) {
  return request<AdminDriver>(`/api/v1/admin/drivers/${driverId}`);
}

export function driverDocuments(driverId: string) {
  return request<DriverDocument[]>(`/api/v1/admin/drivers/${driverId}/documents`);
}

export function approveDocument(documentId: string) {
  return request<DriverDocument>(`/api/v1/admin/drivers/documents/${documentId}/approve`, {
    method: 'POST',
  });
}

export function rejectDocument(documentId: string, reason: string) {
  return request<DriverDocument>(`/api/v1/admin/drivers/documents/${documentId}/reject`, {
    method: 'POST',
    body: { reason },
  });
}

/**
 * Opens the document itself in a new tab.
 *
 * <p>Fetched with the token and handed to the browser as a blob, because the endpoint is
 * authenticated - and it is authenticated because a KYC document behind a plain URL is readable by
 * anybody who finds the link. The object URL is revoked on the next tick; the tab keeps its copy.
 */
export async function openDocument(documentId: string) {
  const blob = await requestBlob(`/api/v1/admin/drivers/documents/${documentId}/file`);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function driverVehicles(driverId: string) {
  return request<Vehicle[]>(`/api/v1/admin/drivers/${driverId}/vehicles`);
}

export function approveVehicle(vehicleId: string) {
  return request<Vehicle>(`/api/v1/admin/drivers/vehicles/${vehicleId}/approve`, { method: 'POST' });
}

export function rejectVehicle(vehicleId: string) {
  return request<Vehicle>(`/api/v1/admin/drivers/vehicles/${vehicleId}/reject`, { method: 'POST' });
}

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  DRIVING_LICENCE: "Driver's licence",
  IDENTITY_PROOF: 'Identity proof',
  ADDRESS_PROOF: 'Address proof',
  VEHICLE_REGISTRATION: 'Vehicle registration',
  VEHICLE_INSURANCE: 'Insurance certificate',
  BACKGROUND_CHECK: 'Background check',
};

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  BICYCLE: 'Bicycle', SCOOTER: 'Scooter', MOTORCYCLE: 'Motorcycle',
  E_RICKSHAW: 'E-rickshaw', AUTO_RICKSHAW: 'Auto rickshaw',
  HATCHBACK: 'Hatchback', SEDAN: 'Sedan', MPV: 'MPV', SUV: 'SUV',
  VAN: 'Van', PICKUP: 'Pickup', MINIBUS: 'Minibus', BUS: 'Bus',
};

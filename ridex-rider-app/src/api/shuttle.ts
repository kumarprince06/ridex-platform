import { request } from './client';

export type Stop = {
  id: string;
  sequence: number;
  name: string;
  /** Strings, as the server sends them: these are NUMERIC(9,6) and a double round-trip drifts. */
  latitude: string;
  longitude: string;
  /** Minutes after departure, not a clock time - one route serves every departure on it. */
  offsetMinutes: number;
};

export type ShuttleRoute = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  stops: Stop[];
};

/** Who is driving and what to look for at the stop. Null until a departure has a crew. */
export type Crew = {
  driverName: string;
  driverPhone: string | null;
  driverRating: string | null;
  vehicle: string;
  registrationNumber: string;
  seatCapacity: number;
  /** Where the vehicle is, from fifteen minutes before departure. Null before that. */
  latitude: number | null;
  longitude: number | null;
};

export type Departure = {
  scheduleId: string;
  departureTime: string;
  daysOfWeek: string;
  seatCapacity: number;
  crew: Crew | null;
};

export type Seat = { label: string; available: boolean };

export type SeatMap = {
  shuttleTripId: string;
  routeName: string;
  departsAt: string;
  seatCapacity: number;
  seatsPerRow: number;
  /**
   * Seats before the aisle, 0 when there is none.
   *
   * From the server, never guessed here: two apps drawing the same bus differently is how a rider
   * picks the window seat and finds themselves next to the door.
   */
  aisleAfter: number;
  seats: Seat[];
  seatsAvailable: number;
  /** What this leg costs, when both stops were named. Null on a whole-route seat map. */
  fareMinor: number | null;
  currency: string | null;
};

export type ShuttleBooking = {
  id: string;
  routeName: string;
  seatLabel: string;
  boardingStopName: string;
  alightingStopName: string;
  boardingLat: number;
  boardingLng: number;
  alightingLat: number;
  alightingLng: number;
  departsAt: string;
  currency: string;
  /** The published fare, before points. */
  fareMinor: number;
  /** Points spent on this seat, and what they took off the fare. */
  redeemedPoints: number;
  discountMinor: number;
  /** Set when a pass covered the seat, so nothing was charged. */
  passId: string | null;
  status: string;
  /** The six digits the rider shows the driver. Null in the list: only its hash is stored. */
  boardingCode: string | null;
  crew: Crew | null;
  /** PAID, or PENDING while the seat is held for a rider who has not paid yet. */
  paymentStatus: string;
  /** The departure's run: SCHEDULED, RUNNING or COMPLETED. */
  tripStatus: string;
  boarded: boolean;
  boardedAt: string | null;
  /** When the shuttle reached the rider's drop-off stop. */
  alightedAt: string | null;
  /** Cancellation closes here - half an hour before departure. */
  cancellableUntil: string;
  /**
   * What cancelling right now would credit back as points, in money terms. Zero for a pass,
   * or once the cutoff has passed.
   */
  creditIfCancelledMinor: number;
  /** Present only on a fresh booking that still has to be paid for. */
  checkout: {
    gatewayOrderId: string;
    gatewayKeyId: string;
    amountMinor: number;
    currency: string;
  } | null;
};

export type PassProduct = {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  /** Zero means unlimited rides for the period. */
  rideLimit: number;
  currency: string;
  priceMinor: number;
};

export type Pass = {
  id: string;
  productName: string;
  routeName: string;
  startsOn: string;
  endsOn: string;
  /** Zero means unlimited rides for the period. */
  rideLimit: number;
  ridesUsed: number;
  currency: string;
  pricePaidMinor: number;
  redeemedPoints: number;
  discountMinor: number;
  /** PENDING_PAYMENT until the money clears, then ACTIVE. A pass covers nothing until then. */
  status: string;
  /** Present while it is still unpaid, so an abandoned checkout can be reopened. */
  checkout: {
    gatewayOrderId: string;
    gatewayKeyId: string;
    amountMinor: number;
    currency: string;
  } | null;
};

export function listRoutes() {
  return request<ShuttleRoute[]>('/api/v1/shuttle/routes');
}

export function listDepartures(routeId: string) {
  return request<Departure[]>(`/api/v1/shuttle/routes/${routeId}/departures`);
}

/**
 * The seat picker for one leg.
 *
 * The leg matters: a seat sold from stop 1 to stop 2 is free again from stop 2 onwards, so asking
 * without it would show the far half of a commuter route as full when it is empty.
 */
export function seatMap(
  scheduleId: string,
  serviceDate: string,
  boardingStopId: string,
  alightingStopId: string,
) {
  const query = new URLSearchParams({
    date: serviceDate,
    boardingStopId,
    alightingStopId,
  });
  return request<SeatMap>(`/api/v1/shuttle/departures/${scheduleId}/seats?${query}`);
}

/** Seats are prepaid online; checkout opens at booking. */
export type ShuttlePaymentMethod = 'UPI';

export function bookSeat(booking: {
  scheduleId: string;
  serviceDate: string;
  boardingStopId: string;
  alightingStopId: string;
  seatLabel: string;
  paymentMethod: ShuttlePaymentMethod;
  /**
   * A request, not an instruction: the server spends what the balance and the fare allow, and
   * answers with what it actually took.
   */
  redeemPoints?: number;
}) {
  return request<ShuttleBooking>('/api/v1/shuttle/bookings', { method: 'POST', body: booking });
}

/** This rider's shuttle seats. Newest first, and without the boarding code - see the backend. */
/** One booking, by asking for the rider's own and picking it out - there is no single-seat GET. */
export function getBooking(bookingId: string) {
  return listBookings().then((bookings) => bookings.find((b) => b.id === bookingId) ?? null);
}

export function listBookings() {
  return request<ShuttleBooking[]>('/api/v1/shuttle/bookings');
}

/** Called after checkout closes. The server asks the gateway; it does not believe this call. */
export function confirmShuttlePayment(bookingId: string, gatewayPaymentId: string) {
  return request<ShuttleBooking>(`/api/v1/shuttle/bookings/${bookingId}/payment/confirm`, {
    method: 'POST',
    body: { gatewayPaymentId },
  });
}

export function cancelBooking(bookingId: string) {
  return request<void>(`/api/v1/shuttle/bookings/${bookingId}/cancel`, { method: 'POST' });
}

/** What is on sale for one route. Passes are per route: a commuter buys the corridor they use. */
export function listPassProducts(routeId: string) {
  return request<PassProduct[]>(`/api/v1/shuttle/passes/products?routeId=${routeId}`);
}

export function buyPass(purchase: {
  productId: string;
  startsOn?: string;
  paymentMethod?: 'UPI' | 'CARD';
  redeemPoints?: number;
}) {
  return request<Pass>('/api/v1/shuttle/passes', { method: 'POST', body: purchase });
}

/** The gateway is asked, not the app believed - the same rule as a seat. */
export function confirmPassPayment(passId: string, gatewayPaymentId: string) {
  return request<Pass>(`/api/v1/shuttle/passes/${passId}/payment/confirm`, {
    method: 'POST',
    body: { gatewayPaymentId },
  });
}

export function listPasses() {
  return request<Pass[]>('/api/v1/shuttle/passes');
}

/**
 * ISO date in the device's own timezone.
 *
 * `toISOString()` would be wrong: it converts to UTC first, so a 7am departure booked in India
 * lands on the previous day and the seat map comes back for a date the rider did not pick.
 */
export function toServiceDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** ISO day numbers, as the schedule stores them: 1 is Monday. JS Sunday is 0. */
export function runsOn(daysOfWeek: string, date: Date): boolean {
  const isoDay = date.getDay() === 0 ? 7 : date.getDay();
  return daysOfWeek.split(',').includes(String(isoDay));
}

/** How a seat ended, once its shuttle got the rider there or finished the run. Null while it's still ahead. */
export function shuttleOutcome(booking: ShuttleBooking): 'COMPLETED' | 'MISSED' | null {
  if (booking.status === 'CANCELLED') return null;
  if (!booking.alightedAt && booking.tripStatus !== 'COMPLETED') return null;
  return booking.boarded ? 'COMPLETED' : 'MISSED';
}

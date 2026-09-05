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

export type Departure = {
  scheduleId: string;
  departureTime: string;
  daysOfWeek: string;
  seatCapacity: number;
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
};

export type ShuttleBooking = {
  id: string;
  routeName: string;
  seatLabel: string;
  boardingStopName: string;
  alightingStopName: string;
  departsAt: string;
  currency: string;
  fareMinor: number;
  /** Set when a pass covered the seat, so nothing was charged. */
  passId: string | null;
  status: string;
  /** The six digits the rider shows the driver. Null in the list: only its hash is stored. */
  boardingCode: string | null;
};

export type PassProduct = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  priceMinor: number;
  rides: number | null;
  validDays: number;
};

export type Pass = {
  id: string;
  productName: string;
  ridesRemaining: number | null;
  expiresAt: string;
  status: string;
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

export function bookSeat(booking: {
  scheduleId: string;
  serviceDate: string;
  boardingStopId: string;
  alightingStopId: string;
  seatLabel: string;
}) {
  return request<ShuttleBooking>('/api/v1/shuttle/bookings', { method: 'POST', body: booking });
}

/** This rider's shuttle seats. Newest first, and without the boarding code - see the backend. */
export function listBookings() {
  return request<ShuttleBooking[]>('/api/v1/shuttle/bookings');
}

export function cancelBooking(bookingId: string) {
  return request<void>(`/api/v1/shuttle/bookings/${bookingId}/cancel`, { method: 'POST' });
}

export function listPassProducts() {
  return request<PassProduct[]>('/api/v1/shuttle/passes/products');
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

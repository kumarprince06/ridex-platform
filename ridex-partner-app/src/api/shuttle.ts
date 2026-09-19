import { request } from './client';

/**
 * A passenger on one departure. No boarding code: only its hash is stored, and a driver who could
 * read it could board a seat nobody showed up for.
 */
export type Passenger = {
  bookingId: string;
  seatLabel: string;
  riderName: string;
  alightingStopName: string;
  boarded: boolean;
};

export type StopManifest = {
  stopId: string;
  sequence: number;
  name: string;
  /** Minutes after departure - the driver reads a running order, not clock times. */
  offsetMinutes: number;
  boardingCount: number;
  alightingCount: number;
  onBoardAfter: number;
  boarding: Passenger[];
  alighting: Passenger[];
};

export type Manifest = {
  shuttleTripId: string;
  routeName: string;
  departsAt: string;
  seatCapacity: number;
  seatsSold: number;
  stops: StopManifest[];
};

/** Today's runs unless a date is given. The list already carries each manifest. */
export function myDepartures(date?: string) {
  const query = date ? `?date=${date}` : '';
  return request<Manifest[]>(`/api/v1/driver/shuttle/departures${query}`);
}

export function departureManifest(shuttleTripId: string) {
  return request<Manifest>(`/api/v1/driver/shuttle/departures/${shuttleTripId}/manifest`);
}

/**
 * Checks one passenger in against the code they show. Returns the refreshed manifest, so the
 * counts move with it - and a cash seat is settled server-side by the same call.
 */
export function boardPassenger(shuttleTripId: string, bookingId: string, boardingCode: string) {
  return request<Manifest>(
    `/api/v1/driver/shuttle/departures/${shuttleTripId}/bookings/${bookingId}/board`,
    { method: 'POST', body: { boardingCode } },
  );
}

// Live run -----------------------------------------------------------------------------------

export type LiveStop = {
  id: string;
  sequence: number;
  name: string;
  latitude: number;
  longitude: number;
  scheduledAt: string;
  /** Timetable plus the current delay; null once passed. */
  expectedAt: string | null;
  arrivedAt: string | null;
  state: 'PASSED' | 'CURRENT' | 'UPCOMING';
};

export type ShuttleLive = {
  event: string;
  shuttleTripId: string;
  routeName: string;
  status: 'SCHEDULED' | 'RUNNING' | 'COMPLETED';
  currentStopSequence: number | null;
  delayMinutes: number;
  vehicle: { latitude: number; longitude: number; heading: number | null; at: string } | null;
  stops: LiveStop[];
};

const run = (shuttleTripId: string) => `/api/v1/driver/shuttle/departures/${shuttleTripId}`;

export function departureLive(shuttleTripId: string) {
  return request<ShuttleLive>(`${run(shuttleTripId)}/live`);
}

export function startRun(shuttleTripId: string) {
  return request<ShuttleLive>(`${run(shuttleTripId)}/start`, { method: 'POST' });
}

export function reportRunLocation(shuttleTripId: string, latitude: number, longitude: number, heading: number | null) {
  return request<ShuttleLive>(`${run(shuttleTripId)}/location`, {
    method: 'POST',
    body: { latitude, longitude, heading },
  });
}

export function arriveAtStop(shuttleTripId: string, stopId: string) {
  return request<ShuttleLive>(`${run(shuttleTripId)}/stops/${stopId}/arrive`, { method: 'POST' });
}

export function finishRun(shuttleTripId: string) {
  return request<ShuttleLive>(`${run(shuttleTripId)}/finish`, { method: 'POST' });
}

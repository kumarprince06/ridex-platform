/**
 * Every fake value in the console, in one file, so it is obvious what is static and easy to delete
 * when the API lands (T15). Shapes deliberately match what the endpoints will return.
 */

export type RideState =
  | 'REQUESTED'
  | 'SEARCHING'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_AT_PICKUP'
  | 'TRIP_STARTED'
  | 'COMPLETED'
  | 'CANCELLED_BY_RIDER'
  | 'CANCELLED_BY_DRIVER'
  | 'CANCELLED_BY_SYSTEM'
  | 'EXPIRED';

export type OnboardingState =
  | 'REGISTERED'
  | 'PROFILE_SUBMITTED'
  | 'DOCUMENTS_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type PaymentState =
  | 'CREATED'
  | 'REQUIRES_ACTION'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export const METRICS = {
  liveTrips: 148,
  driversOnline: 412,
  driversTotal: 1268,
  unmatched15m: 6,
  cancellationRate: '4.2%',
  paymentFailureRate: '1.1%',
  gmvToday: '$48,210',
  feeToday: '$9,642',
  openCases: 23,
  pendingApprovals: 9,
};

export const TRIPS_BY_STATE: { state: RideState; count: number }[] = [
  { state: 'SEARCHING', count: 11 },
  { state: 'DRIVER_ASSIGNED', count: 24 },
  { state: 'DRIVER_ARRIVING', count: 31 },
  { state: 'DRIVER_AT_PICKUP', count: 12 },
  { state: 'TRIP_STARTED', count: 70 },
];

export type Rider = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  trips: number;
  joined: string;
  rating: number;
};

export const RIDERS: Rider[] = [
  { id: 'RDR-10021', name: 'Elena Fischer', email: 'elena.f@example.com', phone: '+1 555 0142', city: 'New York', status: 'ACTIVE', trips: 84, joined: '12 Feb 2025', rating: 4.9 },
  { id: 'RDR-10022', name: 'Tom Alvarez', email: 'tom.a@example.com', phone: '+1 555 0173', city: 'New York', status: 'ACTIVE', trips: 26, joined: '03 Jun 2025', rating: 4.7 },
  { id: 'RDR-10023', name: 'Priya Raman', email: 'priya.r@example.com', phone: '+1 555 0190', city: 'Boston', status: 'SUSPENDED', trips: 12, joined: '21 Jan 2026', rating: 3.9 },
  { id: 'RDR-10024', name: 'Daniel Osei', email: 'daniel.o@example.com', phone: '+1 555 0111', city: 'New York', status: 'PENDING', trips: 0, joined: '19 Aug 2026', rating: 0 },
  { id: 'RDR-10025', name: 'Mia Chen', email: 'mia.c@example.com', phone: '+1 555 0128', city: 'Jersey City', status: 'ACTIVE', trips: 213, joined: '08 Sep 2024', rating: 4.95 },
];

export type DriverDoc = {
  type: string;
  status: 'APPROVED' | 'UNDER_REVIEW' | 'REJECTED' | 'EXPIRING' | 'MISSING';
  detail: string;
};

export type Driver = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  onboarding: OnboardingState;
  vehicle: string;
  plate: string;
  rating: number;
  trips: number;
  acceptance: string;
  cancellation: string;
  online: boolean;
  submitted: string;
  documents: DriverDoc[];
};

export const DRIVERS: Driver[] = [
  {
    id: 'DRV-77401', name: 'Marcus Reid', email: 'marcus.reid@example.com', phone: '+1 555 4028',
    city: 'New York', onboarding: 'APPROVED', vehicle: 'Toyota Camry Hybrid', plate: 'KA 05 MJ 4412',
    rating: 4.92, trips: 1284, acceptance: '94%', cancellation: '2%', online: true, submitted: '04 Mar 2024',
    documents: [
      { type: "Driver's licence", status: 'APPROVED', detail: 'Expires 14 Mar 2027' },
      { type: 'Vehicle registration', status: 'APPROVED', detail: 'Expires 02 Jan 2027' },
      { type: 'Insurance certificate', status: 'EXPIRING', detail: 'Expires in 12 days' },
      { type: 'Background check', status: 'APPROVED', detail: 'Cleared 08 Mar 2024' },
    ],
  },
  {
    id: 'DRV-77412', name: 'Ivan Petrov', email: 'ivan.p@example.com', phone: '+1 555 4110',
    city: 'New York', onboarding: 'UNDER_REVIEW', vehicle: 'Hyundai Sonata', plate: 'NY 8821 KD',
    rating: 0, trips: 0, acceptance: '—', cancellation: '—', online: false, submitted: '20 Aug 2026',
    documents: [
      { type: "Driver's licence", status: 'UNDER_REVIEW', detail: 'Submitted 20 Aug 2026' },
      { type: 'Vehicle registration', status: 'UNDER_REVIEW', detail: 'Submitted 20 Aug 2026' },
      { type: 'Insurance certificate', status: 'UNDER_REVIEW', detail: 'Submitted 20 Aug 2026' },
      { type: 'Background check', status: 'MISSING', detail: 'Not started' },
    ],
  },
  {
    id: 'DRV-77390', name: 'Grace Okoro', email: 'grace.o@example.com', phone: '+1 555 4390',
    city: 'Boston', onboarding: 'SUSPENDED', vehicle: 'Kia Carnival', plate: 'MA 4410 PT',
    rating: 4.41, trips: 302, acceptance: '71%', cancellation: '11%', online: false, submitted: '17 Nov 2025',
    documents: [
      { type: "Driver's licence", status: 'APPROVED', detail: 'Expires 30 Sep 2028' },
      { type: 'Vehicle registration', status: 'APPROVED', detail: 'Expires 11 Nov 2026' },
      { type: 'Insurance certificate', status: 'APPROVED', detail: 'Expires 04 Apr 2027' },
      { type: 'Background check', status: 'APPROVED', detail: 'Cleared 20 Nov 2025' },
    ],
  },
  {
    id: 'DRV-77433', name: 'Leo Martins', email: 'leo.m@example.com', phone: '+1 555 4433',
    city: 'Jersey City', onboarding: 'UNDER_REVIEW', vehicle: 'Honda City', plate: 'NJ 2210 QQ',
    rating: 0, trips: 0, acceptance: '—', cancellation: '—', online: false, submitted: '19 Aug 2026',
    documents: [
      { type: "Driver's licence", status: 'UNDER_REVIEW', detail: 'Submitted 19 Aug 2026' },
      { type: 'Vehicle registration', status: 'REJECTED', detail: 'Plate does not match profile' },
      { type: 'Insurance certificate', status: 'UNDER_REVIEW', detail: 'Submitted 19 Aug 2026' },
      { type: 'Background check', status: 'APPROVED', detail: 'Cleared 19 Aug 2026' },
    ],
  },
];

export type TripEvent = { state: RideState | 'PAYMENT_CAPTURED'; at: string; actor: string };

export type Trip = {
  id: string;
  rider: string;
  riderId: string;
  driver: string;
  driverId: string;
  state: RideState;
  tier: string;
  pickup: string;
  dropoff: string;
  requested: string;
  distance: string;
  duration: string;
  gross: string;
  fee: string;
  net: string;
  payment: PaymentState;
  paymentId: string;
  timeline: TripEvent[];
};

export const TRIPS: Trip[] = [
  {
    id: 'TRP-9241', rider: 'Elena Fischer', riderId: 'RDR-10021', driver: 'Marcus Reid', driverId: 'DRV-77401',
    state: 'COMPLETED', tier: 'Comfort', pickup: 'Union Square Park', dropoff: 'Midtown Tower',
    requested: '21 Aug 2026, 15:04', distance: '7.8 km', duration: '19 min',
    gross: '$18.40', fee: '$3.68', net: '$14.72', payment: 'SUCCEEDED', paymentId: 'PAY-55021',
    timeline: [
      { state: 'REQUESTED', at: '15:04:02', actor: 'Elena Fischer' },
      { state: 'SEARCHING', at: '15:04:03', actor: 'Dispatch' },
      { state: 'DRIVER_ASSIGNED', at: '15:04:19', actor: 'Marcus Reid' },
      { state: 'DRIVER_ARRIVING', at: '15:04:21', actor: 'Marcus Reid' },
      { state: 'DRIVER_AT_PICKUP', at: '15:08:44', actor: 'Marcus Reid' },
      { state: 'TRIP_STARTED', at: '15:10:02', actor: 'Marcus Reid' },
      { state: 'COMPLETED', at: '15:29:35', actor: 'Marcus Reid' },
      { state: 'PAYMENT_CAPTURED', at: '15:29:38', actor: 'System' },
    ],
  },
  {
    id: 'TRP-9238', rider: 'Tom Alvarez', riderId: 'RDR-10022', driver: 'Marcus Reid', driverId: 'DRV-77401',
    state: 'TRIP_STARTED', tier: 'Go', pickup: 'Grand Central', dropoff: 'Chelsea Market',
    requested: '21 Aug 2026, 13:41', distance: '4.1 km', duration: '12 min',
    gross: '$10.20', fee: '$2.04', net: '$8.16', payment: 'PROCESSING', paymentId: 'PAY-55018',
    timeline: [
      { state: 'REQUESTED', at: '13:41:10', actor: 'Tom Alvarez' },
      { state: 'SEARCHING', at: '13:41:11', actor: 'Dispatch' },
      { state: 'DRIVER_ASSIGNED', at: '13:41:38', actor: 'Marcus Reid' },
      { state: 'TRIP_STARTED', at: '13:48:02', actor: 'Marcus Reid' },
    ],
  },
  {
    id: 'TRP-9230', rider: 'Priya Raman', riderId: 'RDR-10023', driver: 'Grace Okoro', driverId: 'DRV-77390',
    state: 'CANCELLED_BY_DRIVER', tier: 'Go', pickup: 'Bryant Park', dropoff: 'Hudson Yards',
    requested: '21 Aug 2026, 12:12', distance: '—', duration: '—',
    gross: '$2.00', fee: '$0.00', net: '$2.00', payment: 'SUCCEEDED', paymentId: 'PAY-55009',
    timeline: [
      { state: 'REQUESTED', at: '12:12:00', actor: 'Priya Raman' },
      { state: 'DRIVER_ASSIGNED', at: '12:12:41', actor: 'Grace Okoro' },
      { state: 'CANCELLED_BY_DRIVER', at: '12:20:03', actor: 'Grace Okoro' },
    ],
  },
  {
    id: 'TRP-9226', rider: 'Mia Chen', riderId: 'RDR-10025', driver: '—', driverId: '',
    state: 'SEARCHING', tier: 'XL', pickup: 'JFK Terminal 4', dropoff: 'Brooklyn Heights',
    requested: '21 Aug 2026, 11:58', distance: '24.6 km', duration: '—',
    gross: '$32.90', fee: '$6.58', net: '$26.32', payment: 'CREATED', paymentId: 'PAY-55002',
    timeline: [
      { state: 'REQUESTED', at: '11:58:22', actor: 'Mia Chen' },
      { state: 'SEARCHING', at: '11:58:23', actor: 'Dispatch' },
    ],
  },
];

export type Payment = {
  id: string;
  tripId: string;
  rider: string;
  amount: string;
  state: PaymentState;
  method: string;
  provider: string;
  providerRef: string;
  idempotencyKey: string;
  created: string;
  events: { type: string; at: string; detail: string }[];
};

export const PAYMENTS: Payment[] = [
  {
    id: 'PAY-55021', tripId: 'TRP-9241', rider: 'Elena Fischer', amount: '$18.40', state: 'SUCCEEDED',
    method: 'Visa ••4242', provider: 'Stripe', providerRef: 'pi_3PqL2sK9', idempotencyKey: 'idem-9241-capture',
    created: '21 Aug 2026, 15:29',
    events: [
      { type: 'payment_intent.created', at: '15:04:05', detail: 'Authorised $18.40' },
      { type: 'payment_intent.succeeded', at: '15:29:38', detail: 'Captured $18.40' },
    ],
  },
  {
    id: 'PAY-55018', tripId: 'TRP-9238', rider: 'Tom Alvarez', amount: '$10.20', state: 'PROCESSING',
    method: 'Cash', provider: 'Internal', providerRef: '—', idempotencyKey: 'idem-9238-capture',
    created: '21 Aug 2026, 13:41',
    events: [{ type: 'payment_intent.created', at: '13:41:12', detail: 'Cash trip, settle on completion' }],
  },
  {
    id: 'PAY-54990', tripId: 'TRP-9187', rider: 'Mia Chen', amount: '$26.10', state: 'FAILED',
    method: 'Amex ••1007', provider: 'Stripe', providerRef: 'pi_3PqA7bR2', idempotencyKey: 'idem-9187-capture',
    created: '20 Aug 2026, 21:14',
    events: [
      { type: 'payment_intent.created', at: '21:14:02', detail: 'Authorised $26.10' },
      { type: 'payment_intent.payment_failed', at: '21:14:44', detail: 'card_declined · insufficient_funds' },
    ],
  },
];

export type Payout = {
  id: string;
  driver: string;
  driverId: string;
  amount: string;
  period: string;
  destination: string;
  state: 'SETTLED' | 'IN_TRANSIT' | 'FAILED';
};

export const PAYOUTS: Payout[] = [
  { id: 'PO-4471', driver: 'Marcus Reid', driverId: 'DRV-77401', amount: '$864.10', period: '12–18 Aug', destination: 'HDFC ••4412', state: 'IN_TRANSIT' },
  { id: 'PO-4468', driver: 'Grace Okoro', driverId: 'DRV-77390', amount: '$412.55', period: '12–18 Aug', destination: 'Chase ••2201', state: 'FAILED' },
  { id: 'PO-4402', driver: 'Marcus Reid', driverId: 'DRV-77401', amount: '$792.55', period: '05–11 Aug', destination: 'HDFC ••4412', state: 'SETTLED' },
];

export type Case = {
  id: string;
  subject: string;
  category: 'Fare dispute' | 'Safety' | 'Lost item' | 'Payment' | 'Driver conduct';
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  state: 'OPEN' | 'PENDING' | 'RESOLVED';
  opened: string;
  ageHours: number;
  reporter: string;
  tripId: string;
  assignee: string;
};

export const CASES: Case[] = [
  { id: 'SUP-20418', subject: 'Driver took a longer route', category: 'Fare dispute', priority: 'Normal', state: 'OPEN', opened: '21 Aug 2026, 09:12', ageHours: 6, reporter: 'Elena Fischer', tripId: 'TRP-9241', assignee: 'Priya Nair' },
  { id: 'SUP-20411', subject: 'Phone left in vehicle', category: 'Lost item', priority: 'High', state: 'PENDING', opened: '20 Aug 2026, 22:40', ageHours: 17, reporter: 'Tom Alvarez', tripId: 'TRP-9238', assignee: 'Priya Nair' },
  { id: 'SUP-20402', subject: 'Unsafe driving reported', category: 'Safety', priority: 'Urgent', state: 'OPEN', opened: '20 Aug 2026, 18:03', ageHours: 21, reporter: 'Priya Raman', tripId: 'TRP-9230', assignee: 'Unassigned' },
  { id: 'SUP-20388', subject: 'Card charged twice', category: 'Payment', priority: 'High', state: 'RESOLVED', opened: '19 Aug 2026, 11:22', ageHours: 52, reporter: 'Mia Chen', tripId: 'TRP-9187', assignee: 'Aisha Bello' },
];

export type RideType = {
  id: string;
  name: string;
  seats: number;
  base: string;
  perKm: string;
  perMin: string;
  minFare: string;
  cancelFee: string;
  active: boolean;
};

export const RIDE_TYPES: RideType[] = [
  { id: 'GO', name: 'RideX Go', seats: 4, base: '$2.00', perKm: '$0.90', perMin: '$0.20', minFare: '$4.50', cancelFee: '$2.00', active: true },
  { id: 'COMFORT', name: 'RideX Comfort', seats: 4, base: '$3.00', perKm: '$1.30', perMin: '$0.28', minFare: '$6.50', cancelFee: '$3.00', active: true },
  { id: 'XL', name: 'RideX XL', seats: 6, base: '$4.50', perKm: '$1.70', perMin: '$0.35', minFare: '$9.00', cancelFee: '$4.00', active: true },
  { id: 'MOTO', name: 'RideX Moto', seats: 1, base: '$1.00', perKm: '$0.45', perMin: '$0.10', minFare: '$2.00', cancelFee: '$1.00', active: false },
];

export type SurgeWindow = { id: string; area: string; days: string; hours: string; multiplier: string; active: boolean };

export const SURGE: SurgeWindow[] = [
  { id: 'SRG-01', area: 'Midtown', days: 'Mon–Fri', hours: '17:00–20:00', multiplier: '1.3x', active: true },
  { id: 'SRG-02', area: 'Airport', days: 'Every day', hours: '05:00–08:00', multiplier: '1.5x', active: true },
  { id: 'SRG-03', area: 'Downtown', days: 'Fri–Sat', hours: '22:00–02:00', multiplier: '1.8x', active: false },
];

export type Promotion = {
  code: string;
  description: string;
  discount: string;
  uses: number;
  cap: number;
  expires: string;
  active: boolean;
};

export const PROMOTIONS: Promotion[] = [
  { code: 'WELCOME50', description: '50% off the first ride', discount: '50%', uses: 3821, cap: 5000, expires: '30 Sep 2026', active: true },
  { code: 'AIRPORT10', description: '$10 off airport trips', discount: '$10.00', uses: 942, cap: 2000, expires: '31 Aug 2026', active: true },
  { code: 'WINTER25', description: '25% off, capped at $8', discount: '25%', uses: 5000, cap: 5000, expires: '01 Mar 2026', active: false },
];

export type Template = { id: string; name: string; channel: 'Email' | 'Push' | 'SMS'; event: string; updated: string };

export const TEMPLATES: Template[] = [
  { id: 'TPL-01', name: 'Ride receipt', channel: 'Email', event: 'trip.completed', updated: '12 Aug 2026' },
  { id: 'TPL-02', name: 'Driver assigned', channel: 'Push', event: 'trip.driver_assigned', updated: '02 Aug 2026' },
  { id: 'TPL-03', name: 'OTP verification', channel: 'SMS', event: 'auth.otp_requested', updated: '28 Jul 2026' },
  { id: 'TPL-04', name: 'Payout settled', channel: 'Push', event: 'payout.settled', updated: '19 Aug 2026' },
];

export type FeatureFlag = { key: string; description: string; state: 'ON' | 'OFF' | 'PARTIAL'; rollout: string; updatedBy: string };

export const FLAGS: FeatureFlag[] = [
  { key: 'dispatch.batched_offers', description: 'Send one offer to several drivers at once', state: 'PARTIAL', rollout: '20% of New York', updatedBy: 'Daniel Kim' },
  { key: 'pricing.dynamic_surge', description: 'Demand-driven multipliers instead of fixed windows', state: 'OFF', rollout: '—', updatedBy: 'Daniel Kim' },
  { key: 'rider.scheduled_rides', description: 'Book a ride for later', state: 'ON', rollout: 'All cities', updatedBy: 'Marta Silva' },
  { key: 'partner.qr_pickup', description: 'QR pickup verification alongside the code', state: 'ON', rollout: 'All cities', updatedBy: 'Marta Silva' },
];

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  reason: string;
};

export const AUDIT: AuditEntry[] = [
  { id: 'AUD-88213', at: '21 Aug 2026, 15:42', actor: 'Aisha Bello', role: 'FINANCE', action: 'REFUND_ISSUED', entity: 'PAY-54990', reason: 'Duplicate charge confirmed with provider, case SUP-20388' },
  { id: 'AUD-88209', at: '21 Aug 2026, 14:20', actor: 'Daniel Kim', role: 'OPS_ADMIN', action: 'DRIVER_SUSPENDED', entity: 'DRV-77390', reason: 'Safety report under investigation, case SUP-20402' },
  { id: 'AUD-88201', at: '21 Aug 2026, 11:05', actor: 'Daniel Kim', role: 'OPS_ADMIN', action: 'DOCUMENT_REJECTED', entity: 'DRV-77433', reason: 'Registration plate does not match the profile' },
  { id: 'AUD-88190', at: '20 Aug 2026, 19:48', actor: 'Marta Silva', role: 'SUPER_ADMIN', action: 'FLAG_UPDATED', entity: 'partner.qr_pickup', reason: 'Enabled after pilot in New York' },
  { id: 'AUD-88182', at: '20 Aug 2026, 16:30', actor: 'Marta Silva', role: 'SUPER_ADMIN', action: 'ROLE_GRANTED', entity: 'aisha.bello@ridex.example', reason: 'Joined the finance team' },
];

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: 'SUPPORT' | 'OPS_ADMIN' | 'FINANCE' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  lastActive: string;
};

export const STAFF: StaffMember[] = [
  { id: 'STF-01', name: 'Marta Silva', email: 'marta.silva@ridex.example', role: 'SUPER_ADMIN', status: 'ACTIVE', lastActive: '2 minutes ago' },
  { id: 'STF-02', name: 'Daniel Kim', email: 'daniel.kim@ridex.example', role: 'OPS_ADMIN', status: 'ACTIVE', lastActive: '18 minutes ago' },
  { id: 'STF-03', name: 'Aisha Bello', email: 'aisha.bello@ridex.example', role: 'FINANCE', status: 'ACTIVE', lastActive: '1 hour ago' },
  { id: 'STF-04', name: 'Priya Nair', email: 'priya.nair@ridex.example', role: 'SUPPORT', status: 'ACTIVE', lastActive: '5 minutes ago' },
  { id: 'STF-05', name: 'Omar Haddad', email: 'omar.haddad@ridex.example', role: 'SUPPORT', status: 'INVITED', lastActive: 'Never' },
];

/** Live map positions, offset around a centre so the map has something to draw. */
export const LIVE_DRIVERS: { id: string; name: string; state: RideState; offset: [number, number] }[] = [
  { id: 'DRV-77401', name: 'Marcus Reid', state: 'TRIP_STARTED', offset: [0.004, 0.002] },
  { id: 'DRV-77390', name: 'Grace Okoro', state: 'DRIVER_ARRIVING', offset: [-0.006, 0.004] },
  { id: 'DRV-77412', name: 'Ivan Petrov', state: 'DRIVER_AT_PICKUP', offset: [0.002, -0.005] },
  { id: 'DRV-77433', name: 'Leo Martins', state: 'DRIVER_ASSIGNED', offset: [-0.003, -0.003] },
];

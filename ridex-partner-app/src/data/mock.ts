import { IconName } from '../theme';

/**
 * Sample content for the static pass. Everything here is replaced by API responses once the
 * backend reaches T7..T13 - kept in one file so it is obvious what is fake and easy to delete.
 */

export const DRIVER = {
  name: 'Marcus Reid',
  since: 'March 2024',
  rating: 4.92,
  trips: 1284,
  acceptance: '94%',
  cancellation: '2%',
  phone: '+1 (555) 402 8871',
  email: 'marcus.reid@example.com',
};

export const VEHICLE = {
  make: 'Toyota',
  model: 'Camry Hybrid',
  year: '2022',
  plate: 'KA 05 MJ 4412',
  colour: 'Pearl White',
  seats: '4',
  type: 'Comfort',
  status: 'Approved',
};

/** One offer, as dispatch would push it over the socket. */
export type Offer = {
  id: string;
  rider: string;
  riderRating: number;
  tier: string;
  fare: string;
  surge?: string;
  pickup: string;
  pickupDetail: string;
  pickupEta: string;
  dropoff: string;
  dropoffDetail: string;
  tripDistance: string;
  tripDuration: string;
  payment: string;
};

export const OFFER: Offer = {
  id: 'OFR-77213',
  rider: 'Elena Fischer',
  riderRating: 4.87,
  tier: 'RideX Comfort',
  fare: '$18.40',
  surge: '1.3x',
  pickup: 'Union Square Park',
  pickupDetail: '4 min · 1.2 km away',
  pickupEta: '4 min',
  dropoff: 'Midtown Tower',
  dropoffDetail: '221 W 42nd St',
  tripDistance: '7.8 km',
  tripDuration: '19 min',
  payment: 'Card · Visa 4242',
};

export type TripStatus = 'Completed' | 'Cancelled';

export type Trip = {
  id: string;
  status: TripStatus;
  rider: string;
  tier: string;
  net: string;
  gross: string;
  pickup: string;
  dropoff: string;
  when: string;
  distance: string;
  duration: string;
  rating?: number;
  payment: string;
};

export const TRIPS: Trip[] = [
  {
    id: '9241',
    status: 'Completed',
    rider: 'Elena Fischer',
    tier: 'RideX Comfort',
    net: '$14.72',
    gross: '$18.40',
    pickup: 'Union Square Park',
    dropoff: 'Midtown Tower',
    when: 'Today, 3:12 PM',
    distance: '7.8 km',
    duration: '19 min',
    rating: 5,
    payment: 'Card · Visa 4242',
  },
  {
    id: '9238',
    status: 'Completed',
    rider: 'Tom Alvarez',
    tier: 'RideX Go',
    net: '$8.16',
    gross: '$10.20',
    pickup: 'Grand Central',
    dropoff: 'Chelsea Market',
    when: 'Today, 1:48 PM',
    distance: '4.1 km',
    duration: '12 min',
    rating: 5,
    payment: 'Cash',
  },
  {
    id: '9230',
    status: 'Cancelled',
    rider: 'Priya Nair',
    tier: 'RideX Go',
    net: '$2.00',
    gross: '$2.00',
    pickup: 'Bryant Park',
    dropoff: 'Hudson Yards',
    when: 'Today, 12:20 PM',
    distance: '—',
    duration: '—',
    payment: 'Cancellation fee',
  },
  {
    id: '9221',
    status: 'Completed',
    rider: 'Daniel Kim',
    tier: 'RideX XL',
    net: '$26.32',
    gross: '$32.90',
    pickup: 'JFK Terminal 4',
    dropoff: 'Brooklyn Heights',
    when: 'Yesterday, 9:05 PM',
    distance: '24.6 km',
    duration: '41 min',
    rating: 4,
    payment: 'Card · Amex 1007',
  },
];

/** The fare breakdown, split the way docs/04 requires it to be auditable. */
export type EarningsPeriod = {
  net: string;
  gross: string;
  fee: string;
  tax: string;
  tips: string;
  adjustments: string;
  trips: number;
  online: string;
  perHour: string;
  goal: string;
  goalProgress: number;
};

export const EARNINGS: Record<'Today' | 'Week' | 'Month', EarningsPeriod> = {
  Today: {
    net: '$142.60',
    gross: '$178.25',
    fee: '-$35.65',
    tax: '-$4.20',
    tips: '+$12.00',
    adjustments: '+$2.00',
    trips: 11,
    online: '6h 20m',
    perHour: '$22.51',
    goal: '$200.00',
    goalProgress: 0.71,
  },
  Week: {
    net: '$864.10',
    gross: '$1,080.13',
    fee: '-$216.03',
    tax: '-$25.80',
    tips: '+$68.50',
    adjustments: '-$12.00',
    trips: 63,
    online: '38h 05m',
    perHour: '$22.68',
    goal: '$1,000.00',
    goalProgress: 0.86,
  },
  Month: {
    net: '$3,418.40',
    gross: '$4,273.00',
    fee: '-$854.60',
    tax: '-$102.40',
    tips: '+$241.00',
    adjustments: '-$38.00',
    trips: 247,
    online: '151h 30m',
    perHour: '$22.56',
    goal: '$4,000.00',
    goalProgress: 0.85,
  },
};

export type Payout = {
  id: string;
  amount: string;
  when: string;
  destination: string;
  status: 'Settled' | 'In transit' | 'Failed';
};

export const PAYOUTS: Payout[] = [
  { id: 'PO-4471', amount: '$864.10', when: 'Mon, 12 Aug', destination: 'HDFC ••4412', status: 'In transit' },
  { id: 'PO-4402', amount: '$792.55', when: 'Mon, 5 Aug', destination: 'HDFC ••4412', status: 'Settled' },
  { id: 'PO-4361', amount: '$918.20', when: 'Mon, 29 Jul', destination: 'HDFC ••4412', status: 'Settled' },
];

export type DocumentStatus = 'Approved' | 'Under review' | 'Rejected' | 'Expiring' | 'Missing';

export type DriverDocument = {
  type: string;
  status: DocumentStatus;
  detail: string;
};

export const DOCUMENTS: DriverDocument[] = [
  { type: "Driver's licence", status: 'Approved', detail: 'Expires 14 Mar 2027' },
  { type: 'Vehicle registration', status: 'Approved', detail: 'Expires 02 Jan 2027' },
  { type: 'Insurance certificate', status: 'Expiring', detail: 'Expires in 12 days' },
  { type: 'Background check', status: 'Approved', detail: 'Cleared 08 Mar 2024' },
  { type: 'Profile photo', status: 'Under review', detail: 'Submitted 2 days ago' },
];

export const NOTIFICATIONS: {
  icon: IconName;
  tone: string;
  title: string;
  body: string;
  when: string;
  unread?: boolean;
}[] = [
  { icon: 'cash', tone: '#5FD68A', title: 'Payout on the way', body: '$864.10 is heading to HDFC ••4412.', when: '2h ago', unread: true },
  { icon: 'shield-checkmark', tone: '#8FA0BF', title: 'Document approved', body: 'Your vehicle registration was approved.', when: 'Yesterday', unread: true },
  { icon: 'star', tone: '#E0B252', title: 'You got a 5-star rating', body: 'Elena rated your trip to Midtown Tower.', when: 'Yesterday' },
  { icon: 'trending-up', tone: '#E0785A', title: 'Busy area nearby', body: 'Demand is high around Midtown until 8 PM.', when: '2 days ago' },
];

export const CANCEL_REASONS = [
  'Rider is not at the pickup point',
  'Rider asked me to cancel',
  'Cannot reach the pickup location',
  'Too many passengers for the vehicle',
  'Vehicle or safety problem',
  'Other',
];

export const RIDER_RATING_TAGS = ['On time', 'Polite', 'Clear pickup', 'Left it clean', 'Great chat'];

export const FAQS = [
  'When do I get paid?',
  'Why am I not receiving ride offers?',
  'How is my acceptance rate calculated?',
  'What happens if a rider cancels after I arrive?',
  'How do I update my vehicle or documents?',
  'How do I report a safety incident?',
];

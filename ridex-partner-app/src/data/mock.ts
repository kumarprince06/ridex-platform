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

export const RIDER_RATING_TAGS = ['On time', 'Polite', 'Clear pickup', 'Left it clean', 'Great chat'];

export const FAQS = [
  'When do I get paid?',
  'Why am I not receiving ride offers?',
  'How is my acceptance rate calculated?',
  'What happens if a rider cancels after I arrive?',
  'How do I update my vehicle or documents?',
  'How do I report a safety incident?',
];

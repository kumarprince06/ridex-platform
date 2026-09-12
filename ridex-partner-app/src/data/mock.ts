import { IconName } from '../theme';

/**
 * Sample content for the static pass. Everything here is replaced by API responses once the
 * backend reaches T7..T13 - kept in one file so it is obvious what is fake and easy to delete.
 */

/** One offer, as dispatch would push it over the socket. */
/** The fare breakdown, split the way docs/04 requires it to be auditable. */
export type Payout = {
  id: string;
  amount: string;
  when: string;
  destination: string;
  status: 'Settled' | 'In transit' | 'Failed';
};

export type DocumentStatus = 'Approved' | 'Under review' | 'Rejected' | 'Expiring' | 'Missing';

export type DriverDocument = {
  type: string;
  status: DocumentStatus;
  detail: string;
};

export const RIDER_RATING_TAGS = ['On time', 'Polite', 'Clear pickup', 'Left it clean', 'Great chat'];

export const FAQS = [
  'When do I get paid?',
  'Why am I not receiving ride offers?',
  'How is my acceptance rate calculated?',
  'What happens if a rider cancels after I arrive?',
  'How do I update my vehicle or documents?',
  'How do I report a safety incident?',
];

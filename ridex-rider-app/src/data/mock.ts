import { IconName } from '../theme';

/**
 * Sample content for the static pass. Everything here is replaced by API responses once the
 * backend is wired - kept in one file so it is obvious what is fake and easy to delete.
 */

export const DRIVER = {
  name: 'Marcus Rivera',
  vehicle: 'Toyota Camry 2022 · RX · 4821',
  rating: '4.92',
  tier: 'RideX Comfort',
};

export const NOTIFICATIONS: {
  icon: IconName;
  tone: string;
  title: string;
  body: string;
  when: string;
  unread?: boolean;
}[] = [
  {
    icon: 'car',
    tone: '#E0785A',
    title: 'Your driver is 2 minutes away',
    body: 'Marcus Rivera · Pearl White Camry · RX 4821',
    when: '2 min ago',
    unread: true,
  },
  {
    icon: 'checkmark-circle',
    tone: '#5FD68A',
    title: 'Trip completed',
    body: "You've arrived at Midtown Tower. Rate your ride with Marcus R.",
    when: '1 hr ago',
    unread: true,
  },
  {
    icon: 'gift',
    tone: '#E06FA8',
    title: 'Weekend promo — 20% off',
    body: 'Use code RIDEX20 this Saturday & Sunday for 20% off all RideX Comfort rides.',
    when: '2 hrs ago',
  },
  {
    icon: 'card',
    tone: '#E0B252',
    title: 'Payment successful',
    body: '$12.40 charged to Visa •••• 4892 for your ride to Midtown Tower.',
    when: 'Yesterday',
  },
  {
    icon: 'flash',
    tone: '#5FB8D6',
    title: 'RideX Electric is now available',
    body: 'Zero-emission rides now available in your area. Try it today!',
    when: '2 days ago',
  },
];

export const ISSUE_CATEGORIES: { icon: IconName; tone: string; label: string }[] = [
  { icon: 'car', tone: '#E0785A', label: 'Driver Behavior' },
  { icon: 'location', tone: '#E05A6F', label: 'Wrong Route' },
  { icon: 'card', tone: '#E0B252', label: 'Payment Issue' },
  { icon: 'cube', tone: '#C89A6A', label: 'Lost Item' },
  { icon: 'ban', tone: '#E05A6F', label: 'Safety Concern' },
  { icon: 'bug', tone: '#B8D65F', label: 'App Bug' },
];

export const FAQS = [
  'How do I cancel a ride?',
  'What if my driver does not show up?',
  'How do promo codes work?',
  'How do I report a lost item?',
  'Is RideX available 24/7?',
];

export type RideTier = {
  id: string;
  name: string;
  blurb: string;
  price: string;
  eta: string;
  seats: number;
  tone: string;
  icon: IconName;
  popular?: boolean;
};

export const RIDE_TIERS: RideTier[] = [
  { id: 'go', name: 'RideX Go', blurb: 'Affordable everyday rides', price: '$8–11', eta: '3 min', seats: 3, tone: '#E0785A', icon: 'car' },
  { id: 'comfort', name: 'RideX Comfort', blurb: 'Extra legroom & quiet ride', price: '$13–17', eta: '5 min', seats: 4, tone: '#5FB8D6', icon: 'car-sport', popular: true },
  { id: 'xl', name: 'RideX XL', blurb: 'SUV for groups up to 6', price: '$18–24', eta: '7 min', seats: 6, tone: '#8FA0BF', icon: 'bus' },
  { id: 'premium', name: 'RideX Premium', blurb: 'Luxury sedans & executive', price: '$28–36', eta: '8 min', seats: 4, tone: '#E05A6F', icon: 'car-sport' },
  { id: 'electric', name: 'RideX Electric', blurb: 'Zero emissions, smooth ride', price: '$10–14', eta: '6 min', seats: 4, tone: '#E0B252', icon: 'flash' },
];

export const RATING_TAGS = ['Friendly', 'Great Driver', 'Clean Car', 'On Time', 'Smooth Ride'];

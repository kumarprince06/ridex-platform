import { IconName } from '../theme';

/**
 * Sample content for the static pass. Everything here is replaced by API responses once the
 * backend is wired - kept in one file so it is obvious what is fake and easy to delete.
 */

export type RideStatus = 'Completed' | 'Cancelled';

export type Ride = {
  id: string;
  status: RideStatus;
  tier: string;
  fare: string;
  pickup: string;
  dropoff: string;
  when: string;
  duration: string;
  rating: number;
};

export const RIDES: Ride[] = [
  {
    id: '3841',
    status: 'Completed',
    tier: 'RideX Comfort',
    fare: '$12.40',
    pickup: 'Home',
    dropoff: 'Midtown Tower',
    when: 'Today, 2:30 PM',
    duration: '18 min',
    rating: 5,
  },
  {
    id: '3822',
    status: 'Completed',
    tier: 'RideX Premium',
    fare: '$34.20',
    pickup: 'Union Square',
    dropoff: 'JFK Airport',
    when: 'Yesterday, 9:15 AM',
    duration: '42 min',
    rating: 4,
  },
  {
    id: '3790',
    status: 'Completed',
    tier: 'RideX Go',
    fare: '$9.80',
    pickup: 'The Alchemist Bar',
    dropoff: 'Home',
    when: 'Aug 14, 7:45 PM',
    duration: '12 min',
    rating: 5,
  },
  {
    id: '3765',
    status: 'Cancelled',
    tier: 'RideX Go',
    fare: '$0.00',
    pickup: 'Home',
    dropoff: 'Brooklyn Bridge',
    when: 'Aug 12, 6:02 PM',
    duration: '—',
    rating: 0,
  },
];

export const DRIVER = {
  name: 'Marcus Rivera',
  vehicle: 'Toyota Camry 2022 · RX · 4821',
  rating: '4.92',
  tier: 'RideX Comfort',
};

export const FARE_LINES: { label: string; amount: string; credit?: boolean }[] = [
  { label: 'Base fare', amount: '$4.00' },
  { label: 'Distance (2.4 km)', amount: '$6.00' },
  { label: 'Time (18 min)', amount: '$2.40' },
  { label: 'Booking fee', amount: '$1.20' },
  { label: 'Promo — RIDEX20', amount: '-$2.72', credit: true },
];

export const PAYMENT_METHODS: {
  icon: IconName;
  tone: string;
  name: string;
  detail: string;
  isDefault?: boolean;
}[] = [
  { icon: 'card', tone: '#E0B252', name: 'Visa Signature', detail: '•••• 4892', isDefault: true },
  { icon: 'wallet', tone: '#E06FA8', name: 'RideX Wallet', detail: '$24.50 balance' },
  { icon: 'logo-apple', tone: '#8FA0BF', name: 'Apple Pay', detail: 'iPhone Wallet' },
  { icon: 'cash', tone: '#5FD68A', name: 'Cash', detail: 'Pay the driver directly' },
];

export const SAVED_PLACES: { icon: IconName; tone: string; name: string; address: string }[] = [
  { icon: 'home', tone: '#E0785A', name: 'Home', address: '742 Evergreen Terrace, Springfield' },
  {
    icon: 'business',
    tone: '#8FA0BF',
    name: 'Work',
    address: 'Midtown Tower, 45 Commerce Blvd, Suite 1200',
  },
  { icon: 'barbell', tone: '#E0B252', name: 'Gym', address: 'Iron & Steel Fitness, 120 West 23rd St' },
  {
    icon: 'airplane',
    tone: '#5FB8D6',
    name: 'Airport',
    address: 'John F. Kennedy International Airport, Terminal 4',
  },
];

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

export const RECENT_PLACES: { icon: IconName; tone: string; name: string; address: string }[] = [
  { icon: 'basketball', tone: '#E0785A', name: 'Madison Square Garden', address: '4 Pennsylvania Plaza, New York' },
  { icon: 'git-branch', tone: '#5FB8D6', name: 'Manhattan Bridge', address: 'Manhattan Bridge, New York' },
  { icon: 'color-palette', tone: '#E06FA8', name: 'MoMA', address: '11 W 53rd St, New York' },
  { icon: 'train', tone: '#E0B252', name: 'Grand Central Terminal', address: '89 E 42nd St, New York' },
  { icon: 'leaf', tone: '#5FD68A', name: 'Central Park', address: 'Central Park, New York' },
];

export const RATING_TAGS = ['Friendly', 'Great Driver', 'Clean Car', 'On Time', 'Smooth Ride'];

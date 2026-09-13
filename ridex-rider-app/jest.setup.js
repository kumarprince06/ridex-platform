/* eslint-env jest */

// The map is a native view: it cannot render in a JS-only test, and what a screen needs proving
// is its own layout, not MapLibre's.
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name) => {
    const Component = ({ children }) => React.createElement(View, { testID: name }, children);
    Component.displayName = name;
    return Component;
  };
  return {
    Map: stub('Map'),
    Camera: stub('Camera'),
    GeoJSONSource: stub('GeoJSONSource'),
    Layer: stub('Layer'),
    ViewAnnotation: stub('ViewAnnotation'),
    UserLocation: stub('UserLocation'),
  };
});

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 12.9716, longitude: 77.5946 },
  })),
}));

// Secure storage is native. Screens only need it to resolve; what it returns is the signed-out
// case, which is the state every auth screen is rendered in anyway.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// Place search and routing are network calls; a screen test must not depend on the internet.
// Shaped by URL, because the two callers want different things: the RideX API returns lists,
// the map providers return a features/routes object. One shape for both makes a screen fail on
// `.find is not a function`, which reads like a screen bug and is not one.
// Most RideX endpoints return lists; these return one object whose arrays a screen maps over.
const OBJECT_BODIES = [
  [/\/support\/tickets\/(?!categories)[^/]+(\/messages)?$/, { messages: [] }],
  [/\/rides\/[^/]+\/receipt$/, { quotedLines: [], chargedLines: [], differenceMinor: 0 }],
  // One ride by id - not the two list endpoints that sit at the same depth.
  [/\/rides\/(?!estimate$|cancellation-reasons$)[^/?]+$/, {
    id: 'ride-00000001', status: 'COMPLETED', rideTypeCode: 'MINI', currency: 'INR',
    pickupAddress: '', destinationAddress: '', pickupLat: 12.97, pickupLng: 77.59,
    destinationLat: 12.98, destinationLng: 77.64, quotedFareMinor: 0, fareLines: [],
    redeemedPoints: 0, discountMinor: 0, cancellationFeeMinor: null, cancellationReason: null,
    pickupCode: null, driver: null, requestedAt: '2026-09-14T08:00:00Z',
  }],
  [/\/shuttle\/departures\/[^/]+\/seats(\?|$)/, {
    shuttleTripId: 'trip-1', routeName: '', departsAt: '2026-09-14T08:00:00Z',
    seatCapacity: 0, seatsPerRow: 4, seatsBeforeAisle: 2, seats: [],
  }],
];

function bodyFor(url) {
  if (!url.includes('/api/v1/')) return { features: [], routes: [] };
  const match = OBJECT_BODIES.find(([pattern]) => pattern.test(url));
  return match ? match[1] : [];
}

global.fetch = jest.fn(async (url) => {
  const body = bodyFor(String(url));
  return {
    ok: true,
    status: 200,
    // text() as well as json(): the API client reads the body as text so it can tell an empty
    // 204 from a JSON payload.
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
});

// Screens render here without a NavigationContainer, and useFocusEffect throws outside one. Focus
// is the navigator's concern: in a render test it runs once, like a mount.
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: (effect) => React.useEffect(effect, [effect]),
  };
});

// Checkout is a native module; importing it outside a device throws before the screen renders.
jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: { open: jest.fn(async () => ({})) },
}));

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
    Images: stub('Images'),
  };
});

// Screens render here without a navigator; the map only asks whether its screen is on top.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 12.9716, longitude: 77.5946 },
  })),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
}));

// Secure storage is native. Screens only need it to resolve, and null is the signed-out case.
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
  [/\/driver\/earnings$/, { recent: [] }],
  [/\/shuttle\/departures\/[^/]+\/manifest$/, { stops: [] }],
  [/\/support\/tickets\/(?!categories)[^/]+(\/messages)?$/, { messages: [] }],
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

// The camera is a native view; a scanner screen is tested for its overlay, not its preview.
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: ({ children }) => React.createElement(View, { testID: 'CameraView' }, children),
    useCameraPermissions: () => [{ granted: true, status: 'granted' }, jest.fn()],
  };
});

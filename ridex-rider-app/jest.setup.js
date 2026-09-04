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
global.fetch = jest.fn(async (url) => {
  const body = String(url).includes('/api/v1/') ? [] : { features: [], routes: [] };
  return {
    ok: true,
    status: 200,
    // text() as well as json(): the API client reads the body as text so it can tell an empty
    // 204 from a JSON payload.
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
});

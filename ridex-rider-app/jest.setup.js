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

// Place search and routing are network calls; a screen test must not depend on the internet.
global.fetch = jest.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({ features: [], routes: [] }),
}));

/**
 * Renders every screen once. It catches the class of mistake that typecheck cannot see - a style
 * key that does not exist, a bad require, a component called with props it does not accept - and
 * that would otherwise only show up as a red screen on someone's phone.
 */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/.*|native-base|react-native-svg|react-native-qrcode-svg|@maplibre/.*))',
  ],
};

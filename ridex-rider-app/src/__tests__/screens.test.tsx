import fs from 'fs';
import path from 'path';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import { SessionProvider } from '../auth/session';

/**
 * Renders every screen in src/screens once, with the params its route declares.
 *
 * Read off the directory rather than a barrel file: a barrel would have to be kept in step by
 * hand, and the whole point of this test is to cover the screen somebody forgot.
 */
const SCREENS_DIR = path.join(__dirname, '..', 'screens');

/** Only the screens whose routes carry params need an entry. */
const PARAMS: Record<string, object> = {
  CheckInbox: { email: 'rider@example.com' },
  VerifyOtp: { email: 'rider@example.com', password: 'not-a-real-password' },
  ProfileSetup: { fullName: 'Ada Rider' },
  PersonalDetails: { fullName: 'Ada Rider' },
  RoutePreview: { destination: 'Midtown Tower' },
  ChooseRide: { destination: 'Midtown Tower' },
  FareEstimate: { destination: 'Midtown Tower', tierId: 'comfort' },
  FindingDriver: { destination: 'Midtown Tower' },
  DriverAssigned: { destination: 'Midtown Tower' },
  DriverApproaching: { destination: 'Midtown Tower' },
  DriverArrived: { destination: 'Midtown Tower' },
  TripInProgress: { destination: 'Midtown Tower' },
  RideCompleted: { destination: 'Midtown Tower' },
  TripDetails: { rideId: '3841', tripId: '9241' },
  TripReceipt: { rideId: '3841', tripId: '9241' },
};

function makeNavigation() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    setOptions: jest.fn(),
    setParams: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    getParent: jest.fn(() => ({ reset: jest.fn(), navigate: jest.fn(), goBack: jest.fn() })),
    getState: jest.fn(() => ({ routes: [], index: 0 })),
  };
}

const files = fs
  .readdirSync(SCREENS_DIR)
  .filter((file) => file.endsWith('Screen.tsx'))
  .sort();

describe('every screen renders', () => {
  it('finds the screen files', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  test.each(files)('%s', async (file) => {
    const routeName = file.replace(/Screen\.tsx$/, '');
    const componentName = `${routeName}Screen`;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(path.join(SCREENS_DIR, file));
    const Screen = mod[componentName] ?? mod.default;

    expect(Screen).toBeDefined();

    const props = {
      navigation: makeNavigation(),
      route: { key: `${routeName}-1`, name: routeName, params: PARAMS[routeName] ?? {} },
    };

    // Wrapped, because screens that read the session throw outside the provider - which is the
    // correct behaviour, and would otherwise make this test unable to render them at all.
    let tree: ReturnType<typeof create> | undefined;
    await act(async () => {
      tree = create(createElement(SessionProvider, null, createElement(Screen, props)));
    });

    expect(tree!.toJSON()).toBeTruthy();
    await act(async () => {
      tree!.unmount();
    });
  });
});

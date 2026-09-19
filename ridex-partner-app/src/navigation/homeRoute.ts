import type { PartialState, StackNavigationState } from '@react-navigation/native';

import { currentTrip } from '../api/driver';
import type { OnboardingStatus } from '../api/profile';
import type { RootStackParamList } from './types';

type ResetState = PartialState<StackNavigationState<RootStackParamList>>;
type HomeRoute = ResetState['routes'][number];

// Where a signed-in driver belongs, so a relaunch or a sign-in resumes onboarding instead of
// dropping an unapproved driver onto a Drive screen that cannot take offers.
const ROUTES: Record<OnboardingStatus, HomeRoute> = {
  REGISTERED: { name: 'PersonalDetails', params: { fullName: '' } },
  PROFILE_SUBMITTED: { name: 'UploadDocuments' },
  DOCUMENTS_SUBMITTED: { name: 'UploadDocuments' },
  UNDER_REVIEW: { name: 'UnderReview' },
  APPROVED: { name: 'MainTabs', params: { screen: 'Drive' } },
  REJECTED: { name: 'Rejected' },
  SUSPENDED: { name: 'Suspended' },
};

const TRIP_SCREENS: Record<string, HomeRoute['name']> = {
  DRIVER_ASSIGNED: 'NavigateToPickup',
  DRIVER_ARRIVING: 'NavigateToPickup',
  DRIVER_AT_PICKUP: 'ArrivedAtPickup',
  TRIP_STARTED: 'TripInProgress',
};

/** An approved driver mid-trip reopens on that trip, with the tabs underneath for back. */
export async function homeRoute(status: OnboardingStatus): Promise<ResetState> {
  const home = ROUTES[status];
  if (status !== 'APPROVED') {
    return { index: 0, routes: [home] };
  }
  const trip = await currentTrip().catch(() => undefined);
  const screen = trip && TRIP_SCREENS[trip.status];
  return screen
    ? { index: 1, routes: [home, { name: screen, params: { tripId: trip.tripId } }] }
    : { index: 0, routes: [home] };
}

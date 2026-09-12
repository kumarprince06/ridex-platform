import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { useRideStatus } from '../api/rideStatus';
import { type Ride, type RideStatus } from '../api/rides';
import { LngLat } from './location';
import { RootStackParamList } from '../navigation/types';

/** The screens a live ride passes through, in the order the server moves it. */
export type JourneyScreen =
  | 'DriverAssigned'
  | 'DriverApproaching'
  | 'DriverArrived'
  | 'TripInProgress'
  | 'RideCompleted';

/**
 * Which screen a ride's status belongs on.
 *
 * The journey advances because the driver did something and the server recorded it - never
 * because a timer on this phone ran out. A rider watching a countdown that has nothing to do with
 * the car outside is being told a story.
 */
const SCREEN_FOR: Partial<Record<RideStatus, JourneyScreen>> = {
  DRIVER_ASSIGNED: 'DriverAssigned',
  DRIVER_ARRIVING: 'DriverApproaching',
  DRIVER_AT_PICKUP: 'DriverArrived',
  TRIP_STARTED: 'TripInProgress',
  COMPLETED: 'RideCompleted',
};

/**
 * Follows the ride and moves the rider to the screen its status belongs on.
 *
 * Returns the ride as well, because every screen in the chain shows something off it - the driver,
 * the pickup code, the fare.
 */
export function useJourney(
  rideId: string | undefined,
  here: JourneyScreen,
  navigation: NativeStackNavigationProp<RootStackParamList, JourneyScreen>,
  destination: string,
) {
  const { ride, error } = useRideStatus(rideId ?? null);
  const status = ride?.status;

  useEffect(() => {
    if (!status) {
      return;
    }

    // A driver cancellation or a system one ends the ride wherever the rider happens to be
    // standing, so it is its own screen rather than a step in the chain.
    if (status === 'CANCELLED_BY_DRIVER' || status === 'CANCELLED_BY_SYSTEM') {
      navigation.replace('RideCancelled');
      return;
    }

    const next = SCREEN_FOR[status];
    if (next && next !== here) {
      navigation.replace(next, { destination, rideId });
    }
  }, [status, here, navigation, destination, rideId]);

  return { ride, error };
}

/**
 * Where the driver's own phone last reported, in the map's [lng, lat] order.
 *
 * Undefined when the driver has stopped reporting, which hides the marker rather than leaving one
 * standing at a corner the car left ten minutes ago.
 */
export function driverCoordOf(ride: Ride | null): LngLat | undefined {
  const driver = ride?.driver;
  if (!driver || driver.latitude == null || driver.longitude == null) {
    return undefined;
  }
  return [driver.longitude, driver.latitude];
}

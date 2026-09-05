import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ShuttleBooking } from '../api/shuttle';

/** The four persistent destinations behind the bottom bar. */
export type TabParamList = {
  Home: undefined;
  MyRides: undefined;
  Rewards: undefined;
  Profile: undefined;
};

/**
 * Everything that pushes over the tabs, plus the auth flow that precedes them.
 *
 * Params carry only what a screen needs. VerifyOtp takes the email because the backend delivers
 * the code there - SMS is a stub until a provider is wired.
 */
export type RootStackParamList = {
  Splash: undefined;

  Welcome: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  CheckInbox: { email: string };
  NewPassword: undefined;
  CreateAccount: undefined;
  VerifyOtp: { email: string; password?: string };
  Verified: undefined;
  ProfileSetup: { fullName: string };
  PersonalDetails: undefined;
  SaveLocations: undefined;

  MainTabs: NavigatorScreenParams<TabParamList>;

  // Booking flow, in the order a rider walks it.
  /** `picked` is how PickOnMap hands a pinned point back to whichever field asked for it. */
  SearchDestination: {
    picked?: { field: 'pickup' | 'destination'; name: string; coord: [number, number] };
  } | undefined;
  PickOnMap: { mode: 'pickup' | 'destination'; initial?: [number, number] };
  RoutePreview: {
    destination: string;
    destinationCoord?: [number, number];
    /** Omitted means "wherever the phone is", which is still the common case. */
    pickup?: { name: string; coord: [number, number] };
  };
  ChooseRide: {
    destination: string;
    destinationCoord?: [number, number];
    pickup?: { name: string; coord: [number, number] };
  };
  FareEstimate: {
    destination: string;
    tierId: string;
    estimateId?: string;
    // Carried through so the quote can be re-priced against the route the rider actually chose.
    pickupCoord?: [number, number];
    pickupName?: string;
    destinationCoord?: [number, number];
  };
  FindingDriver: { destination: string; rideId?: string };
  DriverAssigned: { destination: string; rideId?: string };
  // The ride id is carried the whole way: the pickup code lives on the ride, and the screen that
  // has to show it is the last one in this chain.
  DriverApproaching: { destination: string; rideId?: string };
  DriverArrived: { destination: string; rideId?: string };
  TripInProgress: { destination: string };
  RideCompleted: { destination: string; rideId?: string };
  RateDriver: { rideId?: string };
  CancelRide: { rideId?: string };
  RideCancelled: undefined;

  // Shuttle: fixed routes and chosen seats, not dispatch. There are no offers and no driver
  // search - the vehicle is already going, and the question is whether a seat on it is free.
  ShuttleRoutes: undefined;
  ShuttleDepartures: { routeId: string };
  ShuttleSeats: {
    routeId: string;
    scheduleId: string;
    serviceDate: string;
    boardingStopId: string;
    alightingStopId: string;
  };
  /**
   * Carries the whole booking, not an id.
   *
   * The boarding code is returned once and only its hash is stored, so there is nothing to
   * re-fetch it from - passing the id would lose the one thing this screen exists to show.
   */
  ShuttleBooked: { booking: ShuttleBooking };

  TripDetails: { rideId: string };
  TripReceipt: { rideId: string };
  ReportIssue: undefined;
  EditProfile: undefined;
  SavedPlaces: undefined;
  Notifications: undefined;
  Settings: undefined;
  PrivacySecurity: undefined;
  HelpSupport: undefined;
};

/**
 * Props for a screen inside the tab navigator. Composite because those screens push root-stack
 * routes too - Profile opens Settings, My Rides opens Trip Details - and a plain
 * BottomTabScreenProps would not know those routes exist.
 */
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

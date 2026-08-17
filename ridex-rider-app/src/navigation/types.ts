import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** The four persistent destinations behind the bottom bar. */
export type TabParamList = {
  Home: undefined;
  MyRides: undefined;
  Wallet: undefined;
  Profile: undefined;
};

/**
 * Everything that pushes over the tabs, plus the auth flow that precedes them.
 *
 * Params carry only what a screen needs to render its own copy. Nothing here talks to the backend
 * yet; when the API lands these stay as they are and gain a data layer behind them.
 */
export type RootStackParamList = {
  Splash: undefined;

  Welcome: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  CheckInbox: { email: string };
  NewPassword: undefined;
  CreateAccount: undefined;
  VerifyOtp: { phone: string };
  Verified: undefined;
  ProfileSetup: { fullName: string };
  PersonalDetails: undefined;
  SaveLocations: undefined;

  MainTabs: NavigatorScreenParams<TabParamList>;

  // Booking flow, in the order a rider walks it.
  SearchDestination: undefined;
  RoutePreview: { destination: string };
  ChooseRide: { destination: string };
  FareEstimate: { destination: string; tierId: string };
  FindingDriver: { destination: string };
  DriverAssigned: { destination: string };
  DriverApproaching: { destination: string };
  DriverArrived: { destination: string };
  TripInProgress: { destination: string };
  RideCompleted: { destination: string };
  RateDriver: undefined;
  CancelRide: undefined;
  RideCancelled: undefined;

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

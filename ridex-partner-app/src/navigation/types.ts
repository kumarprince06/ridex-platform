import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** The four persistent destinations behind the bottom bar. */
export type TabParamList = {
  Drive: undefined;
  Earnings: undefined;
  Trips: undefined;
  Account: undefined;
};

/**
 * Everything that pushes over the tabs, plus the onboarding flow that precedes them.
 *
 * Screen names track the state they produce, not the screenshot they came from - see
 * docs/22-Partner-App-Design.md. Params carry only what a screen needs to render its own copy.
 * Nothing here talks to the backend yet; when the API lands these stay as they are and gain a
 * data layer behind them.
 */
export type RootStackParamList = {
  Splash: undefined;

  // Registration - produces DriverOnboardingStatus.REGISTERED.
  Welcome: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  CheckInbox: { email: string };
  NewPassword: undefined;
  CreateAccount: undefined;
  VerifyOtp: { phone: string };

  // Onboarding, one screen per transition of the driver onboarding machine.
  PersonalDetails: { fullName: string };
  VehicleDetails: undefined;
  UploadDocuments: undefined;
  BankDetails: undefined;
  UnderReview: undefined;
  Approved: undefined;
  Rejected: undefined;
  Suspended: undefined;

  MainTabs: NavigatorScreenParams<TabParamList>;

  // Offer and trip, in the order a driver walks it. Mirrors the ride request machine in docs/11
  // from the opposite side to the rider app.
  RideOffer: undefined;
  OfferLost: undefined;
  NavigateToPickup: undefined;
  ArrivedAtPickup: undefined;
  TripInProgress: undefined;
  TripCompleted: undefined;
  RateRider: undefined;
  CancelTrip: undefined;
  Safety: undefined;

  // Pushed from the tabs.
  TripDetails: { tripId: string };
  Payouts: undefined;
  Documents: undefined;
  Vehicle: undefined;
  PayoutMethod: undefined;
  Ratings: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  Settings: undefined;
  HelpSupport: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

/** A tab screen can navigate within the tabs and out into the root stack, so it needs both. */
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../theme';
import { MainTabs } from './MainTabs';
import { RootStackParamList } from './types';

import { SplashScreen } from '../screens/SplashScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { PickOnMapScreen } from '../screens/PickOnMapScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { CheckInboxScreen } from '../screens/CheckInboxScreen';
import { NewPasswordScreen } from '../screens/NewPasswordScreen';
import { CreateAccountScreen } from '../screens/CreateAccountScreen';
import { VerifyOtpScreen } from '../screens/VerifyOtpScreen';
import { VerifiedScreen } from '../screens/VerifiedScreen';
import { ProfileSetupScreen } from '../screens/ProfileSetupScreen';
import { PersonalDetailsScreen } from '../screens/PersonalDetailsScreen';
import { SaveLocationsScreen } from '../screens/SaveLocationsScreen';

import { SearchDestinationScreen } from '../screens/SearchDestinationScreen';
import { RoutePreviewScreen } from '../screens/RoutePreviewScreen';
import { ChooseRideScreen } from '../screens/ChooseRideScreen';
import { FareEstimateScreen } from '../screens/FareEstimateScreen';
import { FindingDriverScreen } from '../screens/FindingDriverScreen';
import { DriverAssignedScreen } from '../screens/DriverAssignedScreen';
import { DriverApproachingScreen } from '../screens/DriverApproachingScreen';
import { DriverArrivedScreen } from '../screens/DriverArrivedScreen';
import { TripInProgressScreen } from '../screens/TripInProgressScreen';
import { RideCompletedScreen } from '../screens/RideCompletedScreen';
import { RateDriverScreen } from '../screens/RateDriverScreen';
import { CancelRideScreen } from '../screens/CancelRideScreen';
import { RideCancelledScreen } from '../screens/RideCancelledScreen';

import { ShuttleBookedScreen } from '../screens/ShuttleBookedScreen';
import { ShuttleDeparturesScreen } from '../screens/ShuttleDeparturesScreen';
import { ShuttleRoutesScreen } from '../screens/ShuttleRoutesScreen';
import { ShuttleSeatsScreen } from '../screens/ShuttleSeatsScreen';
import { TripDetailsScreen } from '../screens/TripDetailsScreen';
import { TripReceiptScreen } from '../screens/TripReceiptScreen';
import { ReportIssueScreen } from '../screens/ReportIssueScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { SavedPlacesScreen } from '../screens/SavedPlacesScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PrivacySecurityScreen } from '../screens/PrivacySecurityScreen';
import { HelpSupportScreen } from '../screens/HelpSupportScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Stops the white flash React Navigation paints between dark screens by default. */
const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        // Every screen draws its own header, so the native one is redundant throughout.
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />

        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="CheckInbox" component={CheckInboxScreen} />
        <Stack.Screen name="NewPassword" component={NewPasswordScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
        <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
        <Stack.Screen name="Verified" component={VerifiedScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
        <Stack.Screen name="SaveLocations" component={SaveLocationsScreen} />

        <Stack.Screen name="MainTabs" component={MainTabs} />

        <Stack.Screen name="SearchDestination" component={SearchDestinationScreen} />
        <Stack.Screen name="PickOnMap" component={PickOnMapScreen} />
        <Stack.Screen name="RoutePreview" component={RoutePreviewScreen} />
        <Stack.Screen name="ChooseRide" component={ChooseRideScreen} />
        <Stack.Screen name="FareEstimate" component={FareEstimateScreen} />
        <Stack.Screen name="FindingDriver" component={FindingDriverScreen} />
        <Stack.Screen name="DriverAssigned" component={DriverAssignedScreen} />
        <Stack.Screen name="DriverApproaching" component={DriverApproachingScreen} />
        <Stack.Screen name="DriverArrived" component={DriverArrivedScreen} />
        <Stack.Screen name="TripInProgress" component={TripInProgressScreen} />
        <Stack.Screen name="RideCompleted" component={RideCompletedScreen} />
        <Stack.Screen name="RateDriver" component={RateDriverScreen} />
        <Stack.Screen name="CancelRide" component={CancelRideScreen} />
        <Stack.Screen name="RideCancelled" component={RideCancelledScreen} />

        <Stack.Screen name="ShuttleRoutes" component={ShuttleRoutesScreen} />
        <Stack.Screen name="ShuttleDepartures" component={ShuttleDeparturesScreen} />
        <Stack.Screen name="ShuttleSeats" component={ShuttleSeatsScreen} />
        <Stack.Screen name="ShuttleBooked" component={ShuttleBookedScreen} />

        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
        <Stack.Screen name="TripReceipt" component={TripReceiptScreen} />
        <Stack.Screen name="ReportIssue" component={ReportIssueScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="SavedPlaces" component={SavedPlacesScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

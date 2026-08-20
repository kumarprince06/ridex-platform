import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ApprovedScreen } from '../screens/ApprovedScreen';
import { ArrivedAtPickupScreen } from '../screens/ArrivedAtPickupScreen';
import { BankDetailsScreen } from '../screens/BankDetailsScreen';
import { CancelTripScreen } from '../screens/CancelTripScreen';
import { CheckInboxScreen } from '../screens/CheckInboxScreen';
import { CreateAccountScreen } from '../screens/CreateAccountScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { HelpSupportScreen } from '../screens/HelpSupportScreen';
import { NavigateToPickupScreen } from '../screens/NavigateToPickupScreen';
import { NewPasswordScreen } from '../screens/NewPasswordScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { OfferLostScreen } from '../screens/OfferLostScreen';
import { PayoutMethodScreen } from '../screens/PayoutMethodScreen';
import { PayoutsScreen } from '../screens/PayoutsScreen';
import { PersonalDetailsScreen } from '../screens/PersonalDetailsScreen';
import { RateRiderScreen } from '../screens/RateRiderScreen';
import { RatingsScreen } from '../screens/RatingsScreen';
import { RejectedScreen } from '../screens/RejectedScreen';
import { RideOfferScreen } from '../screens/RideOfferScreen';
import { SafetyScreen } from '../screens/SafetyScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { SuspendedScreen } from '../screens/SuspendedScreen';
import { TripCompletedScreen } from '../screens/TripCompletedScreen';
import { TripDetailsScreen } from '../screens/TripDetailsScreen';
import { TripInProgressScreen } from '../screens/TripInProgressScreen';
import { UnderReviewScreen } from '../screens/UnderReviewScreen';
import { UploadDocumentsScreen } from '../screens/UploadDocumentsScreen';
import { VehicleDetailsScreen } from '../screens/VehicleDetailsScreen';
import { VehicleScreen } from '../screens/VehicleScreen';
import { VerifyOtpScreen } from '../screens/VerifyOtpScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { colors } from '../theme';
import { MainTabs } from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Dark by default, so the navigator's own background never flashes white between screens. */
const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        // Every screen draws its own header via <Screen>, so the native one is redundant.
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

        <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
        <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
        <Stack.Screen name="UploadDocuments" component={UploadDocumentsScreen} />
        <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
        <Stack.Screen name="UnderReview" component={UnderReviewScreen} />
        <Stack.Screen name="Approved" component={ApprovedScreen} />
        <Stack.Screen name="Rejected" component={RejectedScreen} />
        <Stack.Screen name="Suspended" component={SuspendedScreen} />

        <Stack.Screen name="MainTabs" component={MainTabs} />

        {/*
          The offer takes over the screen from a cold phone in a mount, so it comes up as a modal
          rather than sliding in like an ordinary push.
        */}
        <Stack.Screen name="RideOffer" component={RideOfferScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="OfferLost" component={OfferLostScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="NavigateToPickup" component={NavigateToPickupScreen} />
        <Stack.Screen name="ArrivedAtPickup" component={ArrivedAtPickupScreen} />
        <Stack.Screen name="TripInProgress" component={TripInProgressScreen} />
        <Stack.Screen name="TripCompleted" component={TripCompletedScreen} />
        <Stack.Screen name="RateRider" component={RateRiderScreen} />
        <Stack.Screen name="CancelTrip" component={CancelTripScreen} />
        <Stack.Screen name="Safety" component={SafetyScreen} />

        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
        <Stack.Screen name="Payouts" component={PayoutsScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="Vehicle" component={VehicleScreen} />
        <Stack.Screen name="PayoutMethod" component={PayoutMethodScreen} />
        <Stack.Screen name="Ratings" component={RatingsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

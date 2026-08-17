import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeScreen } from '../screens/HomeScreen';
import { MyRidesScreen } from '../screens/MyRidesScreen';
import { PaymentsScreen } from '../screens/PaymentsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors, IconName, type } from '../theme';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, { active: IconName; idle: IconName }> = {
  Home: { active: 'home', idle: 'home-outline' },
  MyRides: { active: 'time', idle: 'time-outline' },
  Wallet: { active: 'card', idle: 'card-outline' },
  Profile: { active: 'person', idle: 'person-outline' },
};

export function MainTabs() {
  // The gesture bar sits inside the tab bar's own bounds, so a fixed height buries the labels
  // underneath it. Lift the bar by the inset and grow it to match.
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 16);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Every tab screen draws its own heading, so the navigator's header is redundant.
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          // The floor matters as much as the inset: some Android devices report bottom = 0 while
          // still drawing a gesture bar over the app, which buries the labels underneath it.
          height: 60 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: {
          ...type.caption,
          fontSize: 10,
          marginTop: 2,
        },
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons
            name={focused ? ICONS[route.name].active : ICONS[route.name].idle}
            size={size - 2}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="MyRides" component={MyRidesScreen} options={{ title: 'Rides' }} />
      <Tab.Screen name="Wallet" component={PaymentsScreen} options={{ title: 'Wallet' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { request } from './client';

/**
 * Registers this device for push, after asking.
 *
 * The permission is asked for on sign-in rather than at launch: "RideX would like to send you
 * notifications" means something once a rider has an account and a driver to be told about, and
 * a prompt shown before that is the one people deny out of hand - and Android never asks twice.
 */
export async function registerForPush(): Promise<string | null> {
  // A simulator has no push token to give, and asking for one throws rather than returning null.
  if (!Device.isDevice) {
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  const granted =
    existing.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) {
    return null;
  }

  // Android shows nothing in the foreground without a channel, and silently drops the heads-up
  // banner - which reads as push being broken rather than unconfigured.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Ride updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    // Expo mints push tokens per project. Without an EAS project there is nothing to mint
    // against, so this stays quiet rather than crashing a sign-in over a notification.
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await request<void>('/api/v1/devices', {
    method: 'PUT',
    body: { token, platform: Platform.OS, app: 'RIDER' },
  });

  return token;
}

/** Called on sign-out. A token left behind pushes this rider's notices to the next one. */
export async function unregisterPush(token: string) {
  await request<void>(`/api/v1/devices/${encodeURIComponent(token)}`, { method: 'DELETE' });
}

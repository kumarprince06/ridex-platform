import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { request } from './client';

// Asked on sign-in, not at launch: a prompt before there is an account is the one people deny,
// and Android never asks twice.
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

  // Android shows no heads-up banner without a channel, which reads as push being broken.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Trip updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    // Expo mints push tokens per EAS project; without one, stay quiet rather than fail a sign-in.
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await request<void>('/api/v1/devices', {
    method: 'PUT',
    body: { token, platform: Platform.OS, app: 'DRIVER' },
  });

  return token;
}

/** Called on sign-out. A token left behind pushes this driver's notices to the next one. */
export async function unregisterPush(token: string) {
  await request<void>(`/api/v1/devices/${encodeURIComponent(token)}`, { method: 'DELETE' });
}

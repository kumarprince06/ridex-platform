import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the backend lives. Android emulators cannot reach the host's localhost - 10.0.2.2 is the
 * loopback alias that works - and a physical device needs the machine's LAN address, so set
 * EXPO_PUBLIC_API_BASE_URL when running on hardware rather than committing a machine's IP.
 */
function defaultBaseUrl(): string {
  return Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
}

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  defaultBaseUrl();

/** Which surface this client is. The token is granted only this surface's roles. */
export const APP_CONTEXT = 'DRIVER' as const;

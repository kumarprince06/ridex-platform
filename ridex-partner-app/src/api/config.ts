import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the backend lives. Android emulators cannot reach the host's localhost - 10.0.2.2 is the
 * loopback alias that works - and a physical device needs the machine's LAN address, so set
 * `extra.apiBaseUrl` in app.json when running on hardware.
 */
function defaultBaseUrl(): string {
  return Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
}

export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? defaultBaseUrl();

/** Which surface this client is. The token is granted only this surface's roles. */
export const APP_CONTEXT = 'DRIVER' as const;

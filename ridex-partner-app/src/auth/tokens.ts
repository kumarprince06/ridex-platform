import * as SecureStore from 'expo-secure-store';

// Keychain on iOS, EncryptedSharedPreferences on Android. AsyncStorage would put a week-long
// refresh token in plain text on disk.
const ACCESS_KEY = 'ridex.driver.accessToken';
const REFRESH_KEY = 'ridex.driver.refreshToken';

export type TokenPair = { accessToken: string; refreshToken: string };

export async function saveTokens(tokens: TokenPair): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
  ]);
}

export async function loadTokens(): Promise<TokenPair | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}

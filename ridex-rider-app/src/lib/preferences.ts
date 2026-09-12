import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

/**
 * Settings that only this device cares about.
 *
 * <p>Kept here rather than on the server because nothing server-side reads them: data saver and
 * background location change what this phone does, and a second phone signing in has its own
 * answer. Anything the server acts on - whether to push - lives on the server instead.
 */
const KEY = 'ridex.devicePreferences';

export type DevicePreferences = {
  backgroundLocation: boolean;
  dataSaver: boolean;
};

const DEFAULTS: DevicePreferences = {
  backgroundLocation: true,
  dataSaver: false,
};

export function useDevicePreferences() {
  const [preferences, setPreferences] = useState<DevicePreferences>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(KEY)
      .then((stored) => {
        if (!cancelled && stored) {
          setPreferences({ ...DEFAULTS, ...(JSON.parse(stored) as Partial<DevicePreferences>) });
        }
      })
      // A preference that cannot be read is a preference at its default, not an error to show.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const set = (change: Partial<DevicePreferences>) => {
    const next = { ...preferences, ...change };
    setPreferences(next);
    void SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => undefined);
  };

  return { preferences, set };
}

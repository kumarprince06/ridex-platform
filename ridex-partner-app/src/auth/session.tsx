import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as authApi from '../api/auth';
import { setSessionExpiredHandler } from '../api/client';
import { getProfile, type DriverProfile } from '../api/profile';
import { clearTokens, loadTokens } from './tokens';

type SessionState = {
  /** Null until the stored tokens have been checked, so the app can hold the splash screen. */
  ready: boolean;
  profile: DriverProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<DriverProfile | null>(null);

  const signOut = useCallback(async () => {
    const tokens = await loadTokens();
    if (tokens) {
      // Best effort: a failed revoke must not trap the user in a signed-in state on this device.
      await authApi.logout(tokens.refreshToken).catch(() => undefined);
    }
    await clearTokens();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    setProfile(await getProfile());
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);
      await refreshProfile();
    },
    [refreshProfile],
  );

  useEffect(() => {
    // A refresh that fails anywhere in the app lands here, so the user is dropped once rather
    // than seeing an error on every screen that happens to be loading.
    setSessionExpiredHandler(() => setProfile(null));
  }, []);

  useEffect(() => {
    void (async () => {
      const tokens = await loadTokens();
      if (tokens) {
        // Tokens on disk are not proof of a live session - the account may have been suspended
        // or every session revoked. One call settles it.
        await refreshProfile().catch(() => clearTokens());
      }
      setReady(true);
    })();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({ ready, profile, signIn, signOut, refreshProfile }),
    [ready, profile, signIn, signOut, refreshProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return session;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import * as authApi from '../api/auth';
import { setSessionExpiredHandler } from '../api/client';
import { getProfile, type RiderProfile } from '../api/profile';
import { registerForPush, unregisterPush } from '../api/push';
import { clearTokens, loadTokens } from './tokens';

type SessionState = {
  /** Null until the stored tokens have been checked, so the app can hold the splash screen. */
  ready: boolean;
  profile: RiderProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<RiderProfile | null>(null);

  // The token this device registered, so sign-out can take it back off the account.
  const pushToken = useRef<string | null>(null);

  const signOut = useCallback(async () => {
    if (pushToken.current) {
      await unregisterPush(pushToken.current).catch(() => undefined);
      pushToken.current = null;
    }

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
      // Best effort, and after the profile: a denied permission or a device with no push
      // support must not turn a successful sign-in into a failed one.
      pushToken.current = await registerForPush().catch(() => null);
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
        pushToken.current = await registerForPush().catch(() => null);
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

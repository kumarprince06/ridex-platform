import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import * as authApi from '../api/auth';
import { setSessionExpiredHandler } from '../api/client';
import { ApiError } from '../api/problem';
import { getProfile, type DriverProfile } from '../api/profile';
import { setDuty } from '../api/driver';
import { registerForPush, unregisterPush } from '../api/push';
import { clearTokens, loadTokens } from './tokens';

type SessionState = {
  /** Null until the stored tokens have been checked, so the app can hold the splash screen. */
  ready: boolean;
  profile: DriverProfile | null;
  signIn: (email: string, password: string) => Promise<DriverProfile>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<DriverProfile>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<DriverProfile | null>(null);

  // The token this device registered, so sign-out can take it back off the account.
  const pushToken = useRef<string | null>(null);

  const signOut = useCallback(async () => {
    if (pushToken.current) {
      await unregisterPush(pushToken.current).catch(() => undefined);
      pushToken.current = null;
    }

    const tokens = await loadTokens();
    if (tokens) {
      // Off duty first, while the token still works: a signed-out phone must not stay in dispatch.
      await setDuty(false).catch(() => undefined);
      // Best effort: a failed revoke must not trap the user in a signed-in state on this device.
      await authApi.logout(tokens.refreshToken).catch(() => undefined);
    }
    await clearTokens();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const next = await getProfile();
    setProfile(next);
    return next;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);
      const signedIn = await refreshProfile();
      // Best effort: a denied permission must not turn a successful sign-in into a failed one.
      pushToken.current = await registerForPush().catch(() => null);
      return signedIn;
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
        // Only a rejected session clears them. A backend that is down or unreachable at launch is
        // not a sign-out, or every restart without a network logs the driver out.
        await refreshProfile().catch((caught) => {
          if (caught instanceof ApiError && (caught.status === 401 || caught.status === 403)) {
            return clearTokens();
          }
        });
        // Only for a session that survived the check, and not awaited so the splash never waits on it.
        if (await loadTokens()) {
          registerForPush().then((token) => (pushToken.current = token), () => undefined);
        }
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

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as authApi from '../api/auth';
import { setSessionExpiredHandler } from '../api/client';
import { expand, Permission, ROLE_PERMISSIONS, StaffRole } from './permissions';

export type Session = {
  userId: string;
  email: string;
  roles: StaffRole[];
};

type SessionValue = {
  session: Session | null;
  permissions: Set<Permission>;
  can: (permission: Permission) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // A failed refresh anywhere drops the operator once, rather than erroring on every open panel.
    setSessionExpiredHandler(() => setSession(null));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setSession({ userId: response.userId, email: response.email, roles: response.roles });
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setSession(null);
  }, []);

  const value = useMemo<SessionValue>(() => {
    // Still derived on the client from the roles in the token. The mapping belongs on the server
    // and moves there when the admin API lands - a client-side table is a display convenience,
    // never the authorization decision, which every protected endpoint makes for itself.
    const granted = session
      ? session.roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? [])
      : [];

    const permissions = expand(granted);

    return {
      session,
      permissions,
      can: (permission) => permissions.has(permission),
      signIn,
      signOut,
    };
  }, [session, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return value;
}

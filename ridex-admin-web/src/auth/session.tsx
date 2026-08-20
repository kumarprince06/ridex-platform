import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { expand, Permission, ROLE_PERMISSIONS, StaffRole } from './permissions';

export type Session = {
  name: string;
  email: string;
  role: StaffRole;
};

type SessionValue = {
  session: Session | null;
  permissions: Set<Permission>;
  can: (permission: Permission) => boolean;
  signIn: (role: StaffRole) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

const NAMES: Record<StaffRole, { name: string; email: string }> = {
  SUPPORT: { name: 'Priya Nair', email: 'priya.nair@ridex.example' },
  OPS_ADMIN: { name: 'Daniel Kim', email: 'daniel.kim@ridex.example' },
  FINANCE: { name: 'Aisha Bello', email: 'aisha.bello@ridex.example' },
  SUPER_ADMIN: { name: 'Marta Silva', email: 'marta.silva@ridex.example' },
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const value = useMemo<SessionValue>(() => {
    // In production these come from the access token, not from a role lookup on the client.
    const permissions = session ? expand(ROLE_PERMISSIONS[session.role]) : new Set<Permission>();

    return {
      session,
      permissions,
      can: (permission) => permissions.has(permission),
      signIn: (role) => setSession({ role, ...NAMES[role] }),
      signOut: () => setSession(null),
    };
  }, [session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return value;
}

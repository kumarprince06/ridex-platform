/**
 * The seven permissions from docs/14-Security.md. The console authorizes on these, never on the
 * role name, for the same reason the backend does: a role is a bundle someone will want to change,
 * and every screen that tested `role === 'OPS_ADMIN'` has to be found and edited when they do.
 */
export const PERMISSIONS = [
  'RIDER_SELF',
  'DRIVER_SELF',
  'DRIVER_TRIP',
  'SUPPORT_CASE',
  'OPERATIONS',
  'FINANCE',
  'SUPER_ADMIN',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Staff roles from the backend's UserRole enum. Riders and drivers cannot reach this surface. */
export type StaffRole = 'SUPPORT' | 'OPS_ADMIN' | 'FINANCE' | 'SUPER_ADMIN';

/**
 * Which permissions each role carries. This mapping lives on the server in production - it is
 * here only so the static build can switch identity without a backend.
 */
export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  SUPPORT: ['SUPPORT_CASE'],
  OPS_ADMIN: ['OPERATIONS', 'SUPPORT_CASE'],
  FINANCE: ['FINANCE'],
  SUPER_ADMIN: ['SUPER_ADMIN', 'OPERATIONS', 'FINANCE', 'SUPPORT_CASE'],
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  SUPPORT: 'Support agent',
  OPS_ADMIN: 'Operations admin',
  FINANCE: 'Finance',
  SUPER_ADMIN: 'Super admin',
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  SUPPORT: 'Search users, read trips, run cases. Cannot move money.',
  OPS_ADMIN: 'Approve drivers, monitor trips, configure operations.',
  FINANCE: 'Refunds, adjustments, payouts and settlement.',
  SUPER_ADMIN: 'Everything, including staff accounts and platform settings.',
};

/**
 * Super admin implies the rest, so every check is a single membership test rather than a chain of
 * special cases scattered through the screens.
 */
export function expand(permissions: Permission[]): Set<Permission> {
  const set = new Set(permissions);
  if (set.has('SUPER_ADMIN')) {
    PERMISSIONS.forEach((permission) => set.add(permission));
  }
  return set;
}

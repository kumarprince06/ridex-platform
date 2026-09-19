import { request } from './client';

export type RiderProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  profileImageKey: string | null;
};

export function getProfile(): Promise<RiderProfile> {
  return request<RiderProfile>('/api/v1/rider/profile');
}

/**
 * One name field, two columns. Everything past the first space is the last name, which is wrong
 * for some names and right for most - the alternative is asking twice.
 */
export function splitFullName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  const cut = trimmed.indexOf(' ');
  return cut === -1
    ? { firstName: trimmed, lastName: '' }
    : { firstName: trimmed.slice(0, cut), lastName: trimmed.slice(cut + 1).trim() };
}

export function updateProfile(update: {
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<RiderProfile> {
  return request<RiderProfile>('/api/v1/rider/profile', { method: 'PUT', body: update });
}

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

export function updateProfile(update: {
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<RiderProfile> {
  return request<RiderProfile>('/api/v1/rider/profile', { method: 'PUT', body: update });
}

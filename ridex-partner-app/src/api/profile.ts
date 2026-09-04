import { request } from './client';

export type OnboardingStatus =
  | 'REGISTERED'
  | 'PROFILE_SUBMITTED'
  | 'DOCUMENTS_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type DriverProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  profileImageKey: string | null;
  // Read-only: onboarding moves through the server's state machine, never through a profile edit.
  onboardingStatus: OnboardingStatus;
  rating: number | null;
  ratingCount: number;
};

export function getProfile(): Promise<DriverProfile> {
  return request<DriverProfile>('/api/v1/driver/profile');
}

export function updateProfile(update: {
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<DriverProfile> {
  return request<DriverProfile>('/api/v1/driver/profile', { method: 'PUT', body: update });
}

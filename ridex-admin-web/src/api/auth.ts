import { request, setAccessToken, setRefreshToken, getRefreshToken } from './client';
import type { StaffRole } from '../auth/permissions';

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  roles: StaffRole[];
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await request<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password, app: 'ADMIN' },
    auth: false,
  });
  setAccessToken(response.accessToken);
  setRefreshToken(response.refreshToken);
  return response;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    // Best effort: a failed revoke must not trap the operator in a signed-in state locally.
    await request('/api/v1/auth/logout', { method: 'POST', body: { refreshToken } }).catch(
      () => undefined,
    );
  }
  setAccessToken(null);
  setRefreshToken(null);
}

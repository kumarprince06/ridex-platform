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

/**
 * Rebuilds the session from the stored refresh token after a page load.
 *
 * The access token is deliberately memory-only, so every reload starts with nothing. Without this
 * an operator is signed out by refreshing the page mid-investigation, which is not a security
 * property - it is just an annoyance the refresh token exists to prevent.
 */
export async function restore(): Promise<LoginResponse | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await request<LoginResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    return response;
  } catch {
    // Expired, revoked, or reused. Either way this device has no session any more.
    setRefreshToken(null);
    return null;
  }
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

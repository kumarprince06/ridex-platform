import { request } from './client';
import { APP_CONTEXT } from './config';
import { loadTokens, saveTokens } from '../auth/tokens';

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  roles: string[];
};

/** Answers 202 whether or not the address is taken, so this cannot report "already registered". */
export async function register(email: string, password: string): Promise<void> {
  await request('/api/v1/auth/register', {
    method: 'POST',
    body: { email, password, role: 'RIDER' },
    auth: false,
  });
}

export async function verifyEmail(email: string, code: string): Promise<void> {
  await request('/api/v1/auth/verify', {
    method: 'POST',
    body: { email, code },
    auth: false,
  });
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await request<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password, app: APP_CONTEXT },
    auth: false,
  });
  await saveTokens(response);
  return response;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await request('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export async function resetPassword(email: string, code: string, password: string): Promise<void> {
  await request('/api/v1/auth/reset-password', {
    method: 'POST',
    body: { email, code, password },
    auth: false,
  });
}

export async function logout(refreshToken: string): Promise<void> {
  await request('/api/v1/auth/logout', { method: 'POST', body: { refreshToken } });
}

/** Changing a password from inside the app. Every other session ends with it, by design. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request('/api/v1/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}

export type Session = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  /** The device reading this list. It cannot revoke itself - that is what signing out is for. */
  current: boolean;
};

/** The refresh token goes along so the server can mark which row is this phone. */
export async function listSessions() {
  const refreshToken = (await loadTokens())?.refreshToken;
  return request<Session[]>('/api/v1/auth/sessions', {
    headers: refreshToken ? { 'X-Refresh-Token': refreshToken } : undefined,
  });
}

export async function revokeSession(sessionId: string): Promise<void> {
  await request(`/api/v1/auth/sessions/${sessionId}`, { method: 'DELETE' });
}

export type AuthEvent = {
  eventType: string;
  ipAddress: string | null;
  userAgent: string | null;
  occurredAt: string;
};

export function loginHistory() {
  return request<AuthEvent[]>('/api/v1/auth/login-history');
}

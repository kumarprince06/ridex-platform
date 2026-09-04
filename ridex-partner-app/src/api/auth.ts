import { request } from './client';
import { APP_CONTEXT } from './config';
import { saveTokens } from '../auth/tokens';

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
    body: { email, password, role: 'DRIVER' },
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

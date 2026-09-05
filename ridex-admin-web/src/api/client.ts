import { ApiError, toApiError } from './problem';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

/**
 * The access token stays in memory only. This is the highest-value surface on the platform, and a
 * token in localStorage survives every XSS payload that ever runs on the page.
 *
 * ponytail: the refresh token is in sessionStorage so a page reload does not sign an operator out
 * mid-investigation. Still XSS-reachable - the real fix is an httpOnly cookie, which needs the
 * backend to set one.
 */
const REFRESH_KEY = 'ridex.console.refreshToken';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (token) sessionStorage.setItem(REFRESH_KEY, token);
  else sessionStorage.removeItem(REFRESH_KEY);
}

let onSessionExpired: () => void = () => {};

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

// One refresh at a time: several 401s together must not rotate the token repeatedly, which the
// backend would read as token theft and revoke every session.
let inFlightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    setAccessToken(null);
    setRefreshToken(null);
    onSessionExpired();
    return null;
  }

  const next = await response.json();
  setAccessToken(next.accessToken);
  setRefreshToken(next.refreshToken);
  return next.accessToken as string;
}

type Options = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; auth?: boolean };

async function send(path: string, options: Options, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, 'Network request failed');
  }
}

/**
 * An authorised GET that returns bytes rather than JSON.
 *
 * <p>A plain link cannot be used for these: the endpoint needs a bearer token, and putting a KYC
 * document behind an unauthenticated URL is exactly what streaming it through the API avoids.
 */
export async function requestBlob(path: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!response.ok) {
    throw new Error('That document could not be opened.');
  }
  return response.blob();
}

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const useAuth = options.auth ?? true;
  let response = await send(path, options, useAuth ? accessToken : null);

  if (response.status === 401 && useAuth) {
    inFlightRefresh = inFlightRefresh ?? refreshAccessToken();
    const refreshed = await inFlightRefresh;
    inFlightRefresh = null;

    if (!refreshed) throw new ApiError(401, 'Your session has expired. Sign in again.');
    response = await send(path, options, refreshed);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}

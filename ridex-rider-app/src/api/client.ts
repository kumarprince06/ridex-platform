import { API_BASE_URL } from './config';
import { ApiError, toApiError } from './problem';
import { clearTokens, loadTokens, saveTokens } from '../auth/tokens';

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Public endpoints skip the token and the refresh dance entirely. */
  auth?: boolean;
};

/** Called when a refresh fails, so the session context can drop the user back to sign-in. */
let onSessionExpired: () => void = () => {};

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

// One refresh at a time. Three requests failing together must not rotate the token three times -
// the second rotation would invalidate the first and trip the backend's reuse detection.
let inFlightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });

  if (!response.ok) {
    await clearTokens();
    onSessionExpired();
    return null;
  }

  const next = await response.json();
  await saveTokens({ accessToken: next.accessToken, refreshToken: next.refreshToken });
  return next.accessToken as string;
}

async function send(path: string, options: Options, accessToken?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    // fetch rejects only on a transport failure, so this is always "cannot reach the server".
    throw new ApiError(0, 'Network request failed');
  }
}

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const useAuth = options.auth ?? true;
  let accessToken = useAuth ? (await loadTokens())?.accessToken : undefined;

  let response = await send(path, options, accessToken);

  // Access tokens last 15 minutes, so this is the normal path, not an error path. One retry only:
  // a second 401 after a fresh token means the session is genuinely gone.
  if (response.status === 401 && useAuth) {
    inFlightRefresh = inFlightRefresh ?? refreshAccessToken();
    const refreshed = await inFlightRefresh;
    inFlightRefresh = null;

    if (!refreshed) {
      throw new ApiError(401, 'Your session has expired. Please sign in again.');
    }
    accessToken = refreshed;
    response = await send(path, options, accessToken);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw toApiError(response.status, body);
  }
  return body as T;
}

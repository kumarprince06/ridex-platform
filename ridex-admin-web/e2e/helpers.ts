import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API = 'http://localhost:8090/api/v1';
export const ADMIN = { email: 'e2e-admin@ridex.test', password: 'E2e-Admin-2026' };

/** Signs in through the real form, and fails the test on any page error or server error after. */
export async function signIn(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 500) problems.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/login');
  await page.fill('input[type=email]', ADMIN.email);
  await page.fill('input[type=password]', ADMIN.password);
  await page.click('button[type=submit]');
  await expect(page.locator('.sidebar')).toBeVisible();
  return problems;
}

/** Client-side navigation, the way a person clicks through: no full reload, no re-login. */
export async function go(page: Page, path: string) {
  await page.evaluate((to) => {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForLoadState('networkidle');
}

export async function token(request: APIRequestContext) {
  const response = await request.post(`${API}/auth/login`, { data: { ...ADMIN, app: 'ADMIN' } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).accessToken as string;
}

export async function api(request: APIRequestContext, bearer: string, method: string, path: string, data?: unknown) {
  const response = await request.fetch(`${API}${path}`, {
    method,
    data,
    headers: { Authorization: `Bearer ${bearer}` },
  });
  expect(response.status(), `${method} ${path}: ${await response.text()}`).toBeLessThan(400);
  return response.status() === 204 ? null : response.json();
}

/** A three-stop Kolkata route with fares and one departure, built through the API. */
export async function seedRoute(request: APIRequestContext, bearer: string, code: string, name: string) {
  const route = await api(request, bearer, 'POST', '/admin/shuttle/routes', { code, name, active: false });
  const stops = [
    { name: 'Howrah Station', latitude: 22.5839, longitude: 88.3425, offsetMinutes: 0 },
    { name: 'Esplanade', latitude: 22.5646, longitude: 88.351, offsetMinutes: 15 },
    { name: 'Salt Lake Sector V', latitude: 22.5726, longitude: 88.4318, offsetMinutes: 40 },
  ];
  let built = route;
  for (const stop of stops) {
    built = await api(request, bearer, 'POST', `/admin/shuttle/routes/${route.id}/stops`, stop);
  }
  const ids = built.stops.map((stop: { id: string }) => stop.id);
  await api(request, bearer, 'PUT', `/admin/shuttle/routes/${route.id}/fares/matrix`, {
    currency: 'INR',
    fares: [
      { fromStopId: ids[0], toStopId: ids[1], fareMinor: 2500 },
      { fromStopId: ids[0], toStopId: ids[2], fareMinor: 4000 },
      { fromStopId: ids[1], toStopId: ids[2], fareMinor: 2500 },
    ],
  });
  await api(request, bearer, 'POST', `/admin/shuttle/routes/${route.id}/schedules`, {
    departureTime: '08:30:00', daysOfWeek: '1,2,3,4,5,6,7', seatCapacity: 40, seatsPerRow: 4, active: true,
  });
  return api(request, bearer, 'PUT', `/admin/shuttle/routes/${route.id}`, { code, name, active: true });
}

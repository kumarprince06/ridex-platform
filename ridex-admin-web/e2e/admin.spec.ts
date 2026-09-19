import { expect, test } from '@playwright/test';

import { ADMIN, API, api, go, seedRoute, signIn, token } from './helpers';

// Every screen in the sidebar. Each must render its header with no page error and no 5xx.
const SCREENS = [
  '/', '/live', '/riders', '/drivers', '/approvals', '/trips', '/cases', '/payments', '/payouts', '/wallets',
  '/pricing', '/legal', '/shuttle', '/shuttle/passes', '/shuttle/routes/new', '/shuttle/departures',
  '/analytics', '/audit', '/staff',
];

test('every screen opens cleanly', async ({ page }) => {
  const problems = await signIn(page);
  for (const path of SCREENS) {
    await go(page, path);
    await expect(page.locator('h1').first(), path).toBeVisible();
    await expect(page.locator('.page-error, .error-state'), path).toHaveCount(0);
    await page.screenshot({ path: `e2e/.results/screens${path === '/' ? '/dashboard' : path}.png`, fullPage: true });
  }
  expect(problems).toEqual([]);
});

test.describe('shuttle', () => {
  let routeId: string;

  test.beforeAll(async ({ request }) => {
    const bearer = await token(request);
    const route = await seedRoute(request, bearer, `E2E_${Date.now() % 100000}`, 'Howrah Station to Salt Lake Sector V');
    routeId = route.id;
  });

  test('route tabs show the stops, fares and timetable', async ({ page }) => {
    const problems = await signIn(page);
    await go(page, `/shuttle/routes/${routeId}`);
    await expect(page.getByText('Howrah Station to Salt Lake Sector V').first()).toBeVisible();
    for (const tab of ['Stops', 'Fares', 'Timetable', 'Passes']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await page.waitForLoadState('networkidle');
    }
    await page.getByRole('tab', { name: 'Stops', exact: true }).click();
    await expect(page.getByText('Salt Lake Sector V').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Timetable', exact: true }).click();
    await expect(page.getByText('08:30').first()).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('passes go on sale with a ride count and a cap', async ({ page, request }) => {
    const problems = await signIn(page);
    await go(page, `/shuttle/routes/${routeId}?tab=Passes`);
    await page.getByLabel('Monthly price (₹)').fill('900');
    await page.getByLabel('Rides per month').fill('26');
    await page.getByLabel('Maximum passes on this route').fill('24');
    await page.getByRole('button', { name: 'Put on sale' }).click();
    await expect(page.getByRole('button', { name: 'Stop selling' })).toBeVisible();

    const pricing = await api(request, await token(request), 'GET', `/admin/shuttle/routes/${routeId}/passes`);
    expect(pricing.onSale).toBe(true);
    expect(pricing.ridesPerMonth).toBe(26);
    expect(pricing.maxActivePasses).toBe(24);
    expect(problems).toEqual([]);
  });

  test('a return route is created hidden, stops reversed', async ({ page }) => {
    const problems = await signIn(page);
    await go(page, `/shuttle/routes/${routeId}`);
    await page.getByRole('button', { name: 'Create return route' }).click();
    await page.getByLabel('Departure times, comma separated').fill('18:00');
    await page.locator('.modal').getByRole('button', { name: 'Create return route' }).click();
    await expect(page).not.toHaveURL(new RegExp(routeId));
    await expect(page.getByText('Salt Lake Sector V to Howrah Station').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Stops', exact: true }).click();
    await expect(page.locator('table tbody tr').first()).toContainText('Salt Lake Sector V');
    expect(problems).toEqual([]);
  });

  test('today board lists the departure and it can be cancelled', async ({ page }) => {
    const problems = await signIn(page);
    await go(page, '/shuttle/departures');
    const row = page.locator('.board-card', { hasText: 'Howrah Station to Salt Lake Sector V' }).first();
    await expect(row).toBeVisible();
    await row.getByText('Cancel', { exact: true }).click();
    await page.locator('.modal input').first().fill('Vehicle breakdown');
    await page.locator('.modal').getByRole('button', { name: 'Cancel departure' }).click();
    await expect(page.getByText(/cancelled/i).first()).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test('staff invite gives a password that signs in', async ({ page, request }) => {
  const problems = await signIn(page);
  await go(page, '/staff');
  const email = `support-${Date.now()}@ridex.test`;
  await page.getByRole('button', { name: 'Invite staff' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('First name').fill('Rina');
  await page.locator('.modal').getByRole('button', { name: 'Create account' }).click();
  const password = (await page.locator('.mono', { hasText: /^Rx-/ }).first().textContent())!.trim();

  const login = await request.post(`${API}/auth/login`, { data: { email, password, app: 'ADMIN' } });
  expect(login.ok()).toBeTruthy();
  await expect(page.getByRole('row', { name: new RegExp(email) })).toBeVisible();
  expect(problems).toEqual([]);
});

test('search finds the admin and the audit log records changes', async ({ page }) => {
  const problems = await signIn(page);
  await page.getByPlaceholder(/Search a rider/).fill('Howrah');
  await expect(page.locator('.search-results')).toContainText('Howrah');
  await page.keyboard.press('Escape');

  await go(page, '/audit');
  await expect(page.getByText('ROUTE_CREATED').first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('driver wallets and cab fares open', async ({ page }) => {
  const problems = await signIn(page);
  await go(page, '/wallets');
  await expect(page.getByRole('heading', { name: /wallet/i }).first()).toBeVisible();
  await go(page, '/pricing');
  await expect(page.getByText(/cab fares/i).first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('wrong password is refused on the sign-in page', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type=email]', ADMIN.email);
  await page.fill('input[type=password]', 'not-the-password');
  await page.click('button[type=submit]');
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.locator('.login-card')).toContainText(/incorrect|invalid|wrong/i);
});

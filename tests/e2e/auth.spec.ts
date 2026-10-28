import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { E2E_ADMIN } from './e2e-constants';
import { appPageRoutes } from './helpers';

test.describe('authentication (E-01)', () => {
  test('E-01-02 AC-1/AC-3: every app page redirects to /login without a session', async ({ page }) => {
    const routes = appPageRoutes();
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      await page.goto(route);
      await expect(page, route).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(route).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    }
  });

  test('E-01-01: wrong credentials show a generic error; right ones land on the requested page', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
    await page.getByLabel('Email').fill(E2E_ADMIN.email);
    await page.getByLabel('Password').fill('definitely-wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password' })).toBeVisible();

    await page.getByLabel('Password').fill(E2E_ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'KPI Dashboard' })).toBeVisible();

    const cookie = (await page.context().cookies()).find((c) => c.name === 'hrm_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
  });

  test('E-01-04 AC-3: logout ends the session; going back shows no data', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(E2E_ADMIN.email);
    await page.getByLabel('Password').fill(E2E_ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    // A real history entry for the dashboard, which "Back" will return to.
    const dashboard = await page.goto('/dashboard');
    expect(dashboard?.headers()['cache-control']).toMatch(/no-store/);
    await page.goto('/dashboard?view=2');

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'KPI Dashboard' })).toHaveCount(0);
  });

  test('login page has no serious accessibility violations', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

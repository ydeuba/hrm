import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.describe('app shell (E-00-05)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('AC-1: branded header with navigation and a non-colour active indicator', async ({ page }) => {
    await page.goto('/dashboard');
    const header = page.getByRole('banner');
    await expect(header).toHaveCSS('background-color', 'rgb(16, 35, 63)');
    await expect(header).toContainText('Cloudtech HRM');
    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const label of ['Dashboard', 'Rankings', 'Imports', 'Employees', 'Settings', 'Audit']) {
      await expect(nav.getByRole('link', { name: label })).toBeAttached();
    }
    const active = nav.getByRole('link', { name: 'Dashboard' });
    await expect(active).toHaveAttribute('aria-current', 'page');
    await expect(active).toHaveCSS('font-weight', '700');
    await expect(active).toHaveCSS('text-decoration-line', 'underline');
  });

  test('AC-2: per-request nonce CSP and static security headers', async ({ page }) => {
    const first = await page.goto('/dashboard');
    const second = await page.goto('/dashboard');
    const h1 = first?.headers() ?? {};
    const csp1 = h1['content-security-policy'] ?? '';
    const csp2 = second?.headers()['content-security-policy'] ?? '';
    expect(csp1).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp1).toContain("frame-ancestors 'none'");
    expect(csp1).not.toBe(csp2);
    expect(h1['x-content-type-options']).toBe('nosniff');
    expect(h1['referrer-policy']).toBe('same-origin');
    expect(h1['x-powered-by']).toBeUndefined();
    // The page still hydrates under the strict CSP (scripts carry the nonce).
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.reload();
    await page.getByRole('heading', { name: 'KPI Dashboard' }).waitFor();
    expect(errors.filter((e) => /Content Security Policy/i.test(e))).toEqual([]);
  });

  test('AC-3: 360px wide — no horizontal scroll, keyboard-operable menu', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/dashboard');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    const menu = page.getByRole('button', { name: /menu/i });
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('link', { name: 'Rankings' })).toBeHidden();
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'Rankings' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  test('accessibility: no serious or critical axe violations', async ({ page }) => {
    await page.goto('/dashboard');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

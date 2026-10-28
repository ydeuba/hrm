import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.describe('audit log (E-09-02)', () => {
  test('filters by action, shows Kathmandu times and is read-only and accessible', async ({ page }) => {
    await signIn(page);
    await page.goto('/audit');
    await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
    await page.getByLabel('Action').selectOption('AUTH_LOGIN_OK');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page).toHaveURL(/action=AUTH_LOGIN_OK/);
    const rows = page.getByRole('region', { name: 'Audit events' }).getByRole('row');
    await expect(rows.nth(1)).toContainText('AUTH_LOGIN_OK');
    await expect(rows.nth(1)).toContainText(/\d{2} \w{3} \d{4}, \d{2}:\d{2}/);
    await expect(page.getByRole('region', { name: 'Audit events' }).getByRole('button')).toHaveCount(0);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
});

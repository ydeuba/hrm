import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.describe('settings (E-08)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('E-09-03: Download backup streams a dated zip', async ({ page }) => {
    await page.goto('/settings');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^hrm-backup_\d{8}-\d{4}\.zip$/);
  });

  test('band preview, validation, save and reset to defaults', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('status').filter({ hasText: 'No engineer changes band' })).toBeVisible();

    const outMin = page.getByLabel('Minimum').first();
    await outMin.fill('9');
    await expect(page.getByRole('status').filter({ hasText: /\d+ engineers? would change band/ })).toBeVisible();

    await page.getByLabel('Minimum').nth(1).fill('9.5');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Band minimums must strictly descend' })).toBeVisible();

    await page.getByLabel('Minimum').nth(1).fill('6');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByText('Settings saved')).toBeVisible();

    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

    await page.getByRole('button', { name: 'Reset to defaults' }).click();
    await page.getByRole('dialog', { name: 'Reset settings to defaults?' }).getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByText('Settings saved')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Minimum').first()).toHaveValue('8');
  });
});

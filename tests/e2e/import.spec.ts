import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

const SAMPLE = path.resolve(__dirname, '../fixtures/kpi-master-sheet.xlsx');

test.describe('import flow (E-02-05, E-02-07)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('rejects a non-spreadsheet with a specific message', async ({ page }) => {
    await page.goto('/imports');
    await page.getByLabel('Choose file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
    await expect(page.getByRole('alert').filter({ hasText: 'Only .xlsx and .csv files are accepted.' })).toBeVisible();
  });

  test('upload → preview with summary and warnings → confirm → dashboard', async ({ page }) => {
    await page.goto('/imports');
    await page.getByLabel('Choose file').setInputFiles(SAMPLE);
    await expect(page).toHaveURL(/\/imports\/[a-z0-9]+$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Review import' })).toBeVisible();
    await expect(page.getByText('sprints S122–S138 (17)', { exact: false })).toBeVisible();
    const summary = page.getByRole('region', { name: 'Summary' });
    await expect(summary).toContainText('New employees49');
    await expect(summary).toContainText('Errors0');

    await page.getByRole('tab', { name: /Warnings \(1\)/ }).click();
    await expect(page.getByRole('tabpanel')).toContainText('S122: 5.975 has more than 2 decimals and was rounded');

    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

    await page.getByRole('button', { name: 'Confirm import' }).click();
    await expect(page).toHaveURL(/\/dashboard\?imported=/, { timeout: 20_000 });

    await page.goto('/imports');
    await expect(page.getByRole('table')).toContainText('Committed');
  });

  test('the same file again previews as unchanged and is flagged as already imported', async ({ page }) => {
    await page.goto('/imports');
    await page.getByLabel('Choose file').setInputFiles(SAMPLE);
    await expect(page).toHaveURL(/\/imports\/[a-z0-9]+$/, { timeout: 20_000 });
    await expect(page.getByText(/This file was already imported on/)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Summary' })).toContainText('Matched49');
    await page.getByRole('button', { name: 'Discard' }).click();
    await expect(page).toHaveURL(/\/imports$/);
  });
});

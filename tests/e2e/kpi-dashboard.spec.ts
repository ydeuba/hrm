import { readFileSync } from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { BASE_URL, signIn } from './helpers';

const SAMPLE = path.resolve(__dirname, '../fixtures/kpi-master-sheet.xlsx');

async function ensureData(page: Page): Promise<void> {
  await page.goto('/dashboard');
  if (await page.getByRole('link', { name: 'Upload KPI master sheet' }).isVisible()) {
    const preview = await page.request.post('/api/v1/imports', {
      headers: { origin: BASE_URL },
      multipart: { file: { name: 'kpi.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: readFileSync(SAMPLE) } },
    });
    expect(preview.status()).toBe(201);
    const { id } = (await preview.json()) as { id: string };
    const commit = await page.request.post(`/api/v1/imports/${id}/commit`, { headers: { origin: BASE_URL }, data: { merges: [] } });
    expect(commit.status()).toBe(200);
  }
}

test.describe('KPI dashboard (E-05)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('E-05-06 AC-2: empty state before any import, then data after importing', async ({ page }) => {
    await page.goto('/dashboard');
    const cta = page.getByRole('link', { name: 'Upload KPI master sheet' });
    if (await cta.isVisible()) await expect(cta).toHaveAttribute('href', '/imports');
    await ensureData(page);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'KPI Dashboard' })).toBeVisible();
    await expect(page.getByText(/Sprints S122–S138 \(17\) · 49 engineers · last import/)).toBeVisible();
  });

  test('E-05-01: headline cards match the master sheet', async ({ page }) => {
    await ensureData(page);
    await page.goto('/dashboard');
    const cards = page.getByRole('region', { name: 'Key figures' });
    await expect(cards).toContainText('Engineers49');
    await expect(cards).toContainText('S138 average8.41');
    await expect(cards).toContainText('95.9%');
    await expect(cards).toContainText('Org average7.78');
  });

  test('E-05-02: filters combine, persist in the URL and reset; range refetches', async ({ page }) => {
    await ensureData(page);
    await page.goto('/dashboard');
    await page.getByLabel('Team', { exact: true }).selectOption('DevOps');
    await expect(page).toHaveURL(/team=DevOps/);
    const cards = page.getByRole('region', { name: 'Key figures' });
    await expect(cards).toContainText('Engineers7');
    await page.getByLabel('Designation', { exact: true }).selectOption('SE');
    await expect(cards).toContainText('Engineers2');
    await page.reload();
    await expect(page.getByRole('region', { name: 'Key figures' })).toContainText('Engineers2');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(cards).toContainText('Engineers49');
    await expect(page).not.toHaveURL(/team=/);

    await page.getByLabel('From sprint').selectOption('S133');
    await expect(page).toHaveURL(/from=S133/);
    await expect(page.getByText(/Sprints S133–S138 \(6\)/)).toBeVisible();
  });

  test('E-05-03/04: charts render with table alternatives', async ({ page }) => {
    await ensureData(page);
    await page.goto('/dashboard');
    for (const title of ['Average score by designation', 'Rating distribution', 'Average score by team', 'Org average score per sprint', 'Momentum — biggest movers']) {
      await expect(page.getByRole('heading', { name: new RegExp(title) })).toBeVisible();
    }
    await expect(page.locator('canvas')).toHaveCount(5);
    const panel = page.getByRole('region', { name: 'Average score by designation' });
    await panel.getByRole('button', { name: 'Show as table' }).click();
    await expect(panel.getByRole('table')).toContainText('Team Lead');
    await expect(panel.getByRole('table').getByRole('row')).toHaveCount(5);
  });

  test('E-05-05 + E-06-01: sortable table; Enter opens the profile dialog; Esc closes and restores focus', async ({ page }) => {
    await ensureData(page);
    await page.goto('/dashboard');
    const table = page.getByRole('region', { name: /Engineers/ }).getByRole('table');
    const avgHeader = table.getByRole('columnheader', { name: /Avg score/ });
    await avgHeader.getByRole('button').click();
    await expect(avgHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(table.getByRole('row').nth(1)).toContainText('Dilendra Thagunna');

    const row = table.getByRole('row', { name: /Niba Tandukar/ });
    await row.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Niba Tandukar' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Team Lead · DevOps · Overall rank 4 of 49');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(row).toBeFocused();
  });

  test('E-07-01: print view carries filters, header and confidential footer, without navigation', async ({ page, context }) => {
    await ensureData(page);
    await page.goto('/dashboard?team=DevOps');
    const [print] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: 'Print / PDF' }).click()]);
    await expect(print).toHaveURL(/\/print\/dashboard\?team=DevOps/);
    await print.close();

    await page.goto('/print/dashboard?team=DevOps&autoprint=0');
    await expect(page.getByTestId('print-filters')).toHaveText('Sprints S122–S138 (17) · Team: DevOps');
    await expect(page.getByText(/^Generated /)).toBeVisible();
    await expect(page.getByText('Cloudtech Services · Confidential')).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Key figures' })).toContainText('Engineers7');
    await expect(page.getByRole('region', { name: 'Engineers' }).getByRole('row')).toHaveCount(8);
    await expect(page.locator('canvas')).toHaveCount(5);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: 'Print / Save as PDF' })).toBeHidden();
    // Recorded artefact for the manual print check (E-07-01 DoD).
    await page.goto('/print/dashboard?autoprint=0');
    await page.locator('canvas').first().waitFor();
    await page.pdf({ path: path.resolve(__dirname, '../../test-results/print-dashboard.pdf'), format: 'A4', printBackground: true });
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.screenshot({ path: path.resolve(__dirname, '../../test-results/print-dashboard.png'), fullPage: true });
  });

  test('E-07-02: Export Excel downloads the filtered table with the dated filename', async ({ page }) => {
    await ensureData(page);
    await page.goto('/dashboard?team=DevOps');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Export Excel' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^cloudtech-kpi_S122-S138_\d{8}\.xlsx$/);
  });

  test('dashboard has no serious accessibility violations', async ({ page }) => {
    await ensureData(page);
    await page.goto('/dashboard');
    await page.locator('canvas').first().waitFor();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
});

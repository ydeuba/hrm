import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.describe('employees & teams (E-03)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('E-03-01/02: list, search, edit with audit-visible changes', async ({ page }) => {
    await page.goto('/employees');
    const list = page.getByRole('region', { name: 'Employee list' });
    await expect(list.getByRole('row')).toHaveCount(50);
    await page.getByLabel('Search').fill('mandip');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page).toHaveURL(/q=mandip/);
    await expect(list.getByRole('row')).toHaveCount(2);

    await list.getByRole('button', { name: 'Edit Mandip Thapa' }).click();
    const drawer = page.getByRole('dialog', { name: 'Edit Mandip Thapa' });
    await drawer.getByLabel('Employee code').fill('CTS-777');
    await drawer.getByRole('button', { name: 'Save' }).click();
    await expect(drawer).toBeHidden();
    await expect(list).toContainText('CTS-777');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  });

  test('E-03-03: rename a team and see the old name kept as an alias', async ({ page }) => {
    await page.goto('/employees?tab=labels');
    const teams = page.getByRole('region', { name: 'Teams' });
    const row = teams.getByRole('row').filter({ has: page.locator('input[value="AI Team"]') });
    await row.getByLabel('Name').fill('AI Squad');
    await row.getByRole('button', { name: 'Save' }).click();
    await expect(teams).toContainText('also: ai team');
    const renamed = teams.getByRole('row').filter({ has: page.locator('input[value="AI Squad"]') });
    await renamed.getByLabel('Name').fill('AI Team');
    await renamed.getByRole('button', { name: 'Save' }).click();
    await expect(teams.getByRole('row').filter({ has: page.locator('input[value="AI Team"]') })).toContainText('also: ai squad');
  });

  test('E-07-04: profile "Print appraisal" opens a one-page summary with ranks, rating, range and footer', async ({ page }) => {
    await page.goto('/employees?q=niba');
    await page.getByRole('link', { name: 'Niba Tandukar' }).click();
    const href = await page.getByRole('link', { name: 'Print appraisal' }).getAttribute('href');
    await page.goto(`${href}?autoprint=0`);
    const summary = page.getByRole('article', { name: 'Appraisal summary: Niba Tandukar' });
    await expect(summary).toContainText('Overall rank4 of 49');
    await expect(summary).toContainText('Sprint rangeS122–S138 (17 sprints)');
    await expect(summary).toContainText('RatingOutstanding');
    await expect(summary).toContainText('Cloudtech Services · Confidential');
    await expect(summary).toContainText(/Generated /);
    await expect(summary.locator('canvas')).toHaveCount(1);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    // Recorded artefact for the print check.
    await page.emulateMedia({ media: 'print' });
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.screenshot({ path: 'test-results/print-appraisal.png', fullPage: true });
  });

  test('E-07-05: team print has one summary per engineer, each starting a new page', async ({ page }) => {
    await page.goto('/employees?tab=labels');
    const href = await page.getByRole('link', { name: 'Print appraisals for DevOps' }).getAttribute('href');
    await page.goto(`${href}?autoprint=0`);
    const pages = page.getByRole('article');
    await expect(pages).toHaveCount(7);
    await page.emulateMedia({ media: 'print' });
    expect(await pages.first().evaluate((el) => getComputedStyle(el).breakAfter)).toBe('page');
  });
});

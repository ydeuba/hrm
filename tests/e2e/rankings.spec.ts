import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

const axeSerious = async (page: Page) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0]?.target}`);
};

test.describe('rankings and profile (E-06)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('E-06-03: overall, designation, last-N and summaries tabs', async ({ page }) => {
    await page.goto('/rankings');
    const overall = page.getByRole('region', { name: 'Overall ranking' });
    await expect(overall.getByRole('row').nth(1)).toContainText('Dilendra Thagunna');
    expect(await axeSerious(page)).toEqual([]);

    await page.getByRole('link', { name: 'By designation' }).click();
    for (const d of ['Team Lead', 'SSE', 'SE', 'ASE']) await expect(page.getByRole('region', { name: d, exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Last N sprints' }).click();
    await expect(page.getByText('Window: last 6 sprints with scores (S133–S138).')).toBeVisible();

    await page.getByRole('link', { name: 'Summaries' }).click();
    await expect(page.getByRole('region', { name: 'Interpretation' })).toContainText('Leading team: DevOps at 8.97.');
    await expect(page.getByRole('region', { name: /Top 10 performers/ })).toContainText('Niba Tandukar');
  });

  test('E-06-02: profile page from the dashboard modal shows every sprint with its source', async ({ page }) => {
    await page.goto('/dashboard');
    const row = page.getByRole('row', { name: /Niba Tandukar/ });
    await row.click();
    await page.getByRole('link', { name: 'Open full profile' }).click();
    await expect(page).toHaveURL(/\/employees\/[a-z0-9]+$/);
    await expect(page.getByRole('heading', { name: 'Niba Tandukar', level: 1 })).toBeVisible();
    const scores = page.getByRole('region', { name: 'Sprint scores' });
    await expect(scores.getByRole('row')).toHaveCount(18);
    await expect(scores.getByRole('row', { name: /S129/ })).toContainText('8.33');
    expect(await axeSerious(page)).toEqual([]);

    await page.goto('/employees/does-not-exist');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});

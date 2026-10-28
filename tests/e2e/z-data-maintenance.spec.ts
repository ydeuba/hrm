import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

/** Destructive flows — this file sorts last so earlier specs see the original data. */
async function openProfile(page: Page, name: string): Promise<void> {
  await page.goto(`/employees?q=${encodeURIComponent(name.split(' ')[0] ?? name)}`);
  await page.getByRole('link', { name }).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
}

test.describe('data maintenance (E-03-04/05/06)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('E-03-05: correct a score inline with a reason; invalid values are explained', async ({ page }) => {
    await openProfile(page, 'Niba Tandukar');
    const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'S138', exact: true }) });
    await row.getByRole('button', { name: 'Edit S138 score' }).click();
    const form = page.getByRole('form', { name: 'Correct S138' });
    await form.getByLabel('New value for S138').fill('11');
    await form.getByLabel('Reason').fill('TL confirmed typo');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form.getByRole('alert')).toHaveText('Scores must be between 0 and 10');
    await form.getByLabel('New value for S138').fill('9.5');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(row.getByRole('cell', { name: '9.50' })).toBeVisible();
    await expect(row).toContainText('Manual correction');
  });

  test('E-03-06: erasure requires the exact name, then removes the person everywhere', async ({ page }) => {
    await openProfile(page, 'Love Sainju');
    await page.getByRole('button', { name: 'Erase permanently…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Erase Love Sainju?' });
    await expect(dialog).toContainText('1 stored master-sheet original is deleted');
    const results = await new AxeBuilder({ page }).include('dialog').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
    await dialog.getByLabel('Type “Love Sainju” to confirm').fill('Love');
    await dialog.getByRole('button', { name: 'Erase permanently' }).click();
    await expect(dialog.getByRole('alert')).toHaveText("The name you typed doesn't match");
    await dialog.getByLabel('Type “Love Sainju” to confirm').fill('Love Sainju');
    await dialog.getByRole('button', { name: 'Erase permanently' }).click();
    await expect(page).toHaveURL(/\/employees\?erased=1/);
    await page.goto('/employees?q=love');
    await expect(page.getByRole('link', { name: 'Love Sainju' })).toHaveCount(0);
    await page.goto('/audit?action=EMPLOYEE_ERASE');
    await expect(page.getByRole('region', { name: 'Audit events' }).getByRole('row')).toHaveCount(2);
  });
});

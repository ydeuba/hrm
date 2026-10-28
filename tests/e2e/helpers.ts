import { readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { E2E_ADMIN } from './e2e-constants';

export const BASE_URL = `http://localhost:${process.env.E2E_PORT ?? 3100}`;

/** Sign in through the API; the session cookie lands in the browser context. */
export async function signIn(page: Page): Promise<void> {
  const res = await page.request.post('/api/v1/auth/login', { data: E2E_ADMIN, headers: { origin: BASE_URL } });
  expect(res.status()).toBe(200);
}

/** Every page route in the authenticated (app) group, with dynamic segments filled. */
export function appPageRoutes(): string[] {
  const root = path.resolve(__dirname, '../../src/app/(app)');
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) return walk(full);
      return d.name === 'page.tsx' ? [full] : [];
    });
  return walk(root).map((file) => {
    const rel = path.relative(root, path.dirname(file)).split(path.sep).join('/');
    return `/${rel.replace(/\[[^\]]+\]/g, 'test-id')}`;
  });
}

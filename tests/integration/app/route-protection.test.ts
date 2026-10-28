import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { isPublicPath } from '@/app/_lib/session-cookie';

/**
 * E-01-02 AC-3: enumerate every Route Handler under src/app/api and assert it
 * rejects requests without a session — a new route that forgets the auth
 * wrapper fails this test. Page routes are crawled by the e2e suite.
 */
const API_DIR = path.resolve(__dirname, '../../../src/app/api');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return routeFiles(full);
    return d.name === 'route.ts' ? [full] : [];
  });
}

/** src/app/api/v1/employees/[id]/route.ts → /api/v1/employees/test-id */
function urlPathFor(file: string): string {
  const rel = path.relative(path.resolve(API_DIR, '..'), path.dirname(file)).split(path.sep).join('/');
  return `/${rel.replace(/\[\.\.\.[^\]]+\]/g, 'a/b').replace(/\[[^\]]+\]/g, 'test-id')}`;
}

let t: TestDb;
beforeAll(async () => {
  t = await useTestEnvironment();
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

describe('API route protection crawl', () => {
  const files = routeFiles(API_DIR);

  it('finds route handlers to check', () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  for (const file of files) {
    const urlPath = urlPathFor(file);
    it(`${urlPath} requires a session unless public`, async () => {
      const mod = (await import(file)) as Partial<Record<(typeof METHODS)[number], (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>>>;
      const exported = METHODS.filter((m) => typeof mod[m] === 'function');
      expect(exported.length).toBeGreaterThan(0);
      for (const method of exported) {
        const req = new NextRequest(`http://localhost:3000${urlPath}`, {
          method,
          headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
          ...(method === 'GET' ? {} : { body: '{}' }),
        });
        const res = await mod[method]?.(req, { params: Promise.resolve({ id: 'test-id' }) });
        if (isPublicPath(urlPath)) expect(res?.status).not.toBe(401);
        else expect(res?.status, `${method} ${urlPath}`).toBe(401);
      }
    });
  }
});

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { withPublicHandler as withHandler } from '@/app/_lib/with-handler';
import { HttpError } from '@/app/_lib/http-errors';
import { DomainError, ValidationError } from '@/domain/shared/errors';
import { getContainer } from '@/infrastructure/container';
import { GET as health } from '@/app/api/health/route';

let t: TestDb;
beforeAll(async () => {
  t = await useTestEnvironment({ TRUSTED_ORIGINS: 'https://hrm.example.com' });
});
afterAll(async () => {
  const c = await getContainer();
  await c.close();
  await t.cleanup();
});

const URL_BASE = 'http://localhost:3000';
const post = (body: string, origin = URL_BASE) =>
  new NextRequest(`${URL_BASE}/api/v1/echo`, { method: 'POST', body, headers: { origin, 'content-type': 'application/json' } });

const echo = withHandler({ body: z.object({ name: z.string().min(1) }) }, async ({ body }) => Response.json({ hello: body.name }));

describe('withHandler', () => {
  it('passes a valid body to the handler', async () => {
    const res = await echo(post(JSON.stringify({ name: 'HR' })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: 'HR' });
  });

  it('returns 400 VALIDATION_FAILED with details for an invalid body', async () => {
    const res = await echo(post(JSON.stringify({ name: '' })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_FAILED');
    expect(json.error.details[0].path).toBe('name');
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await echo(post('{not json'));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 403 CSRF_ORIGIN_MISMATCH for a foreign Origin', async () => {
    const res = await echo(post(JSON.stringify({ name: 'x' }), 'https://evil.test'));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('CSRF_ORIGIN_MISMATCH');
  });

  it('accepts a TRUSTED_ORIGINS origin', async () => {
    const res = await echo(post(JSON.stringify({ name: 'x' }), 'https://hrm.example.com'));
    expect(res.status).toBe(200);
  });

  it('parses query and route params', async () => {
    const h = withHandler<undefined, { page: number }, { id: string }>(
      { query: z.object({ page: z.coerce.number() }) },
      async ({ query, params }) => Response.json({ page: query.page, id: params.id }),
    );
    const res = await h(new NextRequest(`${URL_BASE}/api/v1/things/abc?page=2`), { params: Promise.resolve({ id: 'abc' }) });
    expect(await res.json()).toEqual({ page: 2, id: 'abc' });
  });

  it('maps HttpError, DomainError and ValidationError', async () => {
    const throwing = (e: Error) => withHandler({}, async () => { throw e; });
    const http = await throwing(new HttpError(409, 'CONFLICT_X', 'conflict', { a: 1 }, { 'Retry-After': '5' }))(new NextRequest(URL_BASE));
    expect(http.status).toBe(409);
    expect(http.headers.get('retry-after')).toBe('5');
    expect((await http.json()).error).toEqual({ code: 'CONFLICT_X', message: 'conflict', details: { a: 1 } });

    const domain = await throwing(new DomainError('NOT_LATEST', 'not latest'))(new NextRequest(URL_BASE));
    expect(domain.status).toBe(422);
    expect((await domain.json()).error.code).toBe('NOT_LATEST');

    const validation = await throwing(new ValidationError('bad'))(new NextRequest(URL_BASE));
    expect(validation.status).toBe(400);
  });

  it('returns 500 INTERNAL with a correlation id and logs without the request body', async () => {
    const container = await getContainer();
    const spy = vi.spyOn(container.logger, 'error');
    const failing = withHandler({ body: z.object({ password: z.string() }) }, async () => {
      throw new Error('kaboom');
    });
    const res = await failing(post(JSON.stringify({ password: 'super-secret-value' })));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('INTERNAL');
    expect(json.error.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = spy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(logged.correlationId).toBe(json.error.correlationId);
    expect(JSON.stringify(logged)).not.toContain('super-secret-value');
    expect(logged).not.toHaveProperty('body');
    spy.mockRestore();
  });
});

describe('GET /api/health', () => {
  it('reports ok when the database answers', async () => {
    const res = await health(new NextRequest(`${URL_BASE}/api/health`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', db: 'ok' });
  });

  it('reports db down with 503', async () => {
    const container = await getContainer();
    const spy = vi.spyOn(container.db, '$queryRawUnsafe').mockRejectedValueOnce(new Error('disk gone'));
    const res = await health(new NextRequest(`${URL_BASE}/api/health`));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 'ok', db: 'down' });
    spy.mockRestore();
  });
});

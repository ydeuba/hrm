import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { buildZip, MINIMAL_XLSX_PARTS } from '../../helpers/zip';
import { getContainer } from '@/infrastructure/container';
import { LocalFileStore } from '@/infrastructure/files/local-file-store';
import { POST as login } from '@/app/api/v1/auth/login/route';
import { POST as upload } from '@/app/api/v1/imports/route';

const BASE = 'http://localhost:3000';
const sample = readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx'));
let t: TestDb;
let cookie = '';

beforeAll(async () => {
  t = await useTestEnvironment({ UPLOAD_MAX_BYTES: String(1024 * 1024) });
  const { useCases } = await getContainer();
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'upload-test-password' });
  const res = await login(new NextRequest(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { origin: BASE },
    body: JSON.stringify({ email: 'hr@x.com', password: 'upload-test-password' }),
  }));
  cookie = /hrm_session=[^;]+/.exec(res.headers.get('set-cookie') ?? '')?.[0] ?? '';
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

function multipart(fileName: string, bytes: Uint8Array, headers: Record<string, string> = {}) {
  const form = new FormData();
  form.append('file', new File([bytes as BlobPart], fileName));
  return new NextRequest(`${BASE}/api/v1/imports`, { method: 'POST', body: form, headers: { origin: BASE, cookie, ...headers } });
}

describe('POST /api/v1/imports — secure upload (E-02-01)', () => {
  it('AC-3: stores a valid workbook at DATA_DIR/uploads/<sha256>.xlsx and returns the hash', async () => {
    const res = await upload(multipart('KPI Master Sheet (2).xlsx', sample));
    expect(res.status).toBe(201);
    const preview = await res.json();
    const sha = createHash('sha256').update(sample).digest('hex');
    expect(preview).toMatchObject({ fileName: 'KPI Master Sheet (2).xlsx', fileHash: sha, status: 'PREVIEW' });
    const stored = path.join(t.dir, 'uploads', `${sha}.xlsx`);
    expect(existsSync(stored)).toBe(true);
    expect(readFileSync(stored).equals(sample)).toBe(true);
  });

  it('AC-1: rejects an oversized Content-Length with 413 before reading the body', async () => {
    const req = new NextRequest(`${BASE}/api/v1/imports`, {
      method: 'POST',
      headers: { origin: BASE, cookie, 'content-length': String(50 * 1024 * 1024), 'content-type': 'multipart/form-data; boundary=x' },
      body: new ReadableStream({ start(c) { c.error(new Error('body must not be read')); } }),
      duplex: 'half',
    } as unknown as ConstructorParameters<typeof NextRequest>[1]);
    const res = await upload(req);
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe('IMPORT_TOO_LARGE');
  });

  it('AC-1: rejects an oversized streamed body even without Content-Length', async () => {
    const big = new Uint8Array(2 * 1024 * 1024);
    const res = await upload(multipart('big.xlsx', big));
    expect(res.status).toBe(413);
  });

  it('AC-2: rejects macro-enabled, encrypted and zip-bomb files with specific reasons', async () => {
    const cases: [string, Uint8Array, RegExp][] = [
      ['a.xlsm', sample, /Macro-enabled/],
      ['a.xlsx', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0]), /Password-protected/],
      ['a.xlsx', buildZip([...MINIMAL_XLSX_PARTS, { name: 'xl/huge.xml', declaredSize: 80 * 1024 * 1024 }]), /expands beyond/],
      ['notes.txt', new TextEncoder().encode('hello'), /Only .xlsx and .csv/],
    ];
    for (const [name, bytes, msg] of cases) {
      const res = await upload(multipart(name, bytes));
      expect(res.status, name).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('IMPORT_INVALID_FILE');
      expect(body.error.message).toMatch(msg);
    }
  });

  it('rejects requests without a multipart file', async () => {
    const noFile = await upload(new NextRequest(`${BASE}/api/v1/imports`, { method: 'POST', body: new FormData(), headers: { origin: BASE, cookie } }));
    expect(noFile.status).toBe(400);
    const notMultipart = await upload(new NextRequest(`${BASE}/api/v1/imports`, { method: 'POST', body: 'x', headers: { origin: BASE, cookie } }));
    expect(notMultipart.status).toBe(400);
    const empty = await upload(new NextRequest(`${BASE}/api/v1/imports`, { method: 'POST', headers: { origin: BASE, cookie } }));
    expect(empty.status).toBe(400);
  });

  it('requires a session', async () => {
    const form = new FormData();
    form.append('file', new File([sample], 'a.xlsx'));
    const res = await upload(new NextRequest(`${BASE}/api/v1/imports`, { method: 'POST', body: form, headers: { origin: BASE } }));
    expect(res.status).toBe(401);
  });
});

describe('LocalFileStore', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'hrm-fs-'));
  const store = new LocalFileStore(dir);
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('round-trips, returns null for missing keys and deletes idempotently', async () => {
    await store.put('uploads/abc.csv', new Uint8Array([1, 2]));
    expect(await store.get('uploads/abc.csv')).toEqual(new Uint8Array([1, 2]));
    expect(await store.get('uploads/missing.csv')).toBeNull();
    await store.delete('uploads/abc.csv');
    await store.delete('uploads/abc.csv');
    expect(await store.get('uploads/abc.csv')).toBeNull();
  });

  it('refuses keys that could escape the data directory', async () => {
    for (const bad of ['../x', 'uploads/../../x', '/etc/passwd', 'C:\\x', '']) {
      await expect(store.put(bad, new Uint8Array())).rejects.toThrow(/Unsafe|escapes/);
    }
  });
});

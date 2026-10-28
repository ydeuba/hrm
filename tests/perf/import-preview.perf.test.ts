import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { useTestEnvironment } from '../helpers/test-env';
import type { TestDb } from '../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';

/** E-04-07 AC-2 / NFR-02 — parse + interpret + validate + diff + store of a ~5 MB, 200-row master sheet. */
const ROWS = 200;
const SPRINTS = 200;
const TARGET_BYTES = 4.7 * 1_048_576; // just under the 5 MiB default upload limit
const DESIGNATIONS = ['Team Lead', 'SSE', 'SE', 'ASE'];

function workbook(padding: number): Uint8Array {
  const header = ['S.N', 'Resources', 'Designation', 'Team', ...Array.from({ length: SPRINTS }, (_, j) => `S${j + 1}`), 'Total', 'Average'];
  const rows = Array.from({ length: ROWS }, (_, i) => {
    const scores = Array.from({ length: SPRINTS }, (_, j) => ((i * 7 + j * 13) % 50 === 0 ? 'RUN' : Math.round((4 + ((i * 31 + j * 17) % 600) / 100) * 100) / 100));
    const nums = scores.filter((s): s is number => typeof s === 'number');
    const total = Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
    return [i + 1, `Perf Engineer ${i}`, DESIGNATIONS[i % 4], `Team ${i % 8}`, ...scores, total, Math.round((total / nums.length) * 100) / 100];
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), 'KPI');
  // Free-text notes sheet, as HR workbooks carry; brings the file to the target size.
  const notes = Array.from({ length: padding }, (_, i) => [`Note ${i}: ${'review comment '.repeat(64)}${i}`]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(notes), 'Notes');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: false }) as ArrayBuffer);
}

let t: TestDb;
let bytes: Uint8Array;
beforeAll(async () => {
  t = await useTestEnvironment();
  const { db, useCases } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'perf@x.com', password: 'perf-test-password' });
  const base = workbook(0).length;
  const perNote = workbook(100).length - base;
  bytes = workbook(Math.max(0, Math.floor(((TARGET_BYTES - base) / perNote) * 100)));
}, 120_000);

afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

describe('import preview performance', () => {
  it(`${ROWS} rows × ${SPRINTS} sprints, ~5 MB: preview ≤ 5 s`, async () => {
    const { db, useCases } = await getContainer();
    const actorId = (await db.adminUser.findFirstOrThrow()).id;
    expect(bytes.length).toBeGreaterThan(4 * 1_048_576);
    expect(bytes.length).toBeLessThanOrEqual(5 * 1_048_576);
    const start = performance.now();
    const result = await useCases.previewImport.execute({ fileName: 'perf.xlsx', bytes, actorId });
    const ms = performance.now() - start;
    console.log(`import preview: ${(bytes.length / 1_048_576).toFixed(2)} MB, ${ROWS}×${SPRINTS} → ${ms.toFixed(0)} ms`);
    expect(result.ok).toBe(true);
    expect(ms).toBeLessThanOrEqual(5_000);
  }, 120_000);
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { useTestEnvironment } from '../helpers/test-env';
import type { TestDb } from '../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';
import type { SprintCode } from '@/domain/kpi/sprint-code';

/** NFR-04 / E-04-05 AC-3 — run with `npm run test:perf` on the target machine. */
const ENGINEERS = 500;
const SPRINTS = 200;
const SAMPLES = 20;

let t: TestDb;
beforeAll(async () => {
  t = await useTestEnvironment();
  const { db } = await getContainer();
  await seedReferenceData(db);
  const team = await db.team.create({ data: { name: 'Perf Team' } });
  const designation = await db.designation.findFirstOrThrow();
  await db.sprint.createMany({ data: Array.from({ length: SPRINTS }, (_, i) => ({ code: `S${i + 1}`, number: i + 1 })) });
  await db.employee.createMany({
    data: Array.from({ length: ENGINEERS }, (_, i) => ({ displayName: `Perf ${i}`, normalisedName: `perf ${i}`, teamId: team.id, designationId: designation.id })),
  });
  const sprints = await db.sprint.findMany({ select: { id: true } });
  const emps = await db.employee.findMany({ select: { id: true } });
  const rows = emps.flatMap((e, i) => sprints.map((s, j) => ({ employeeId: e.id, sprintId: s.id, status: 'SCORED' as const, valueCenti: 500 + ((i * 7 + j * 13) % 500) })));
  for (let k = 0; k < rows.length; k += 10_000) await db.score.createMany({ data: rows.slice(k, k + 10_000) });
}, 300_000);

afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

const percentile = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.ceil(p * xs.length) - 1] ?? Infinity;

describe('dashboard dataset performance', () => {
  it(`${ENGINEERS}×${SPRINTS}: p95 ≤ 500 ms uncached, payload ≤ 0.7 MB`, async () => {
    const { db, useCases } = await getContainer();
    const query = { from: 'S1' as SprintCode, to: `S${SPRINTS}` as SprintCode, includeInactive: false };
    const run = async () => {
      await db.systemState.update({ where: { id: 1 }, data: { scoreRevision: { increment: 1 } } });
      const start = performance.now();
      const r = await useCases.getDashboardDataset.execute(query);
      const json = JSON.stringify(r.ok ? r.value : null);
      return { ms: performance.now() - start, bytes: json.length };
    };
    await run(); // warm-up (JIT, prepared statements)
    const samples: { ms: number; bytes: number }[] = [];
    for (let i = 0; i < SAMPLES; i++) samples.push(await run());
    const p95 = percentile(samples.map((s) => s.ms), 0.95);
    const bytes = samples[0]?.bytes ?? Infinity;
    console.log(`dataset ${ENGINEERS}×${SPRINTS}: p50=${percentile(samples.map((s) => s.ms), 0.5).toFixed(0)}ms p95=${p95.toFixed(0)}ms size=${(bytes / 1_048_576).toFixed(2)}MB`);
    expect(p95).toBeLessThanOrEqual(500);
    expect(bytes).toBeLessThanOrEqual(0.7 * 1_048_576);
  }, 300_000);

  it('cached request (same revision) is fast', async () => {
    const { useCases } = await getContainer();
    const query = { includeInactive: false };
    await useCases.getDashboardDataset.execute(query);
    const start = performance.now();
    await useCases.getDashboardDataset.execute(query);
    expect(performance.now() - start).toBeLessThan(50);
  });
});

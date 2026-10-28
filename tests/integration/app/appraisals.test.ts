import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';

let t: TestDb;

beforeAll(async () => {
  t = await useTestEnvironment();
  const { useCases, db } = await getContainer();
  await seedReferenceData(db);
  await useCases.createInitialAdmin.execute({ email: 'hr@x.com', password: 'appraisal-test-pass' });
  const actorId = (await db.adminUser.findFirstOrThrow()).id;
  const bytes = new Uint8Array(readFileSync(path.resolve(__dirname, '../../fixtures/kpi-master-sheet.xlsx')));
  const p = await useCases.previewImport.execute({ fileName: 'kpi.xlsx', bytes, actorId });
  if (!p.ok) throw new Error('preview');
  await useCases.commitImport.execute({ batchId: p.value.batchId, actorId, merges: [] });
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

describe('team appraisals (E-07-05)', () => {
  it('AC-1: returns every active engineer of the team in name order with full profiles', async () => {
    const { db, useCases } = await getContainer();
    const team = await db.team.findFirstOrThrow({ where: { name: 'DevOps' } });
    const r = await useCases.getTeamAppraisals.execute(team.id);
    if (!r.ok) throw new Error('expected ok');
    const names = r.value.profiles.map((p) => p.employee.displayName);
    expect(names).toHaveLength(7);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(r.value.profiles.every((p) => p.employee.team.name === 'DevOps' && p.sprints.length === 17)).toBe(true);
    expect(r.value.profiles.find((p) => p.employee.displayName === 'Niba Tandukar')?.overallRank).toBe(4);
  });

  it('AC-2: a team with no engineers yields an empty list; unknown team is NOT_FOUND', async () => {
    const { db, useCases } = await getContainer();
    const empty = await db.team.create({ data: { name: 'Empty Team' } });
    const r = await useCases.getTeamAppraisals.execute(empty.id);
    expect(r.ok && r.value.profiles).toEqual([]);
    expect(await useCases.getTeamAppraisals.execute('nope')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});

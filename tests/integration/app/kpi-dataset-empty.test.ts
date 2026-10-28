import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { useTestEnvironment } from '../../helpers/test-env';
import type { TestDb } from '../../helpers/test-db';
import { getContainer } from '@/infrastructure/container';
import { seedReferenceData } from '@/infrastructure/db/seed-reference';

let t: TestDb;
beforeAll(async () => {
  t = await useTestEnvironment();
  await seedReferenceData((await getContainer()).db);
});
afterAll(async () => {
  await (await getContainer()).close();
  await t.cleanup();
});

describe('dashboard dataset on an empty database (E-05-06 AC-2)', () => {
  it('returns an empty dataset (not an invalid range) before any import', async () => {
    const r = await (await getContainer()).useCases.getDashboardDataset.execute({ includeInactive: false });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect([r.value.sprints, r.value.engineers, r.value.lastImport, r.value.dataCheck]).toEqual([[], [], null, null]);
      expect(r.value.range).toEqual({ from: null, to: null });
    }
  });

  it('an explicit sprint on an empty database is invalid', async () => {
    const r = await (await getContainer()).useCases.getDashboardDataset.execute({ from: 'S1', includeInactive: false });
    expect(r).toEqual({ ok: false, error: 'INVALID_RANGE' });
  });
});

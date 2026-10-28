import 'server-only';
import { DEFAULT_DESIGNATIONS, DEFAULT_KPI_SETTINGS } from '@/domain/settings/defaults';
import { normaliseName } from '@/domain/shared/name';
import { toJson } from './json';
import type { Db } from './prisma';

export interface SeedSummary {
  readonly designationsCreated: number;
  readonly systemStateCreated: boolean;
  readonly settingsCreated: boolean;
}

/**
 * Idempotently seed reference data: designations (with CANONICAL aliases and
 * display order), the SystemState revisions row and default AppSettings.
 * Re-running never duplicates or overwrites existing rows (E-00-03 AC-3).
 */
export async function seedReferenceData(db: Db): Promise<SeedSummary> {
  return db.$transaction(async (tx) => {
    const wanted = DEFAULT_DESIGNATIONS.map((name, i) => ({ name, sortOrder: i + 1, key: normaliseName(name) }));
    const existing = await tx.designationAlias.findMany({
      where: { normalisedName: { in: wanted.map((w) => w.key) } },
      select: { normalisedName: true },
    });
    const present = new Set(existing.map((e) => e.normalisedName));
    const missing = wanted.filter((w) => !present.has(w.key));
    for (const d of missing) {
      await tx.designation.create({
        data: { name: d.name, sortOrder: d.sortOrder, aliases: { create: { normalisedName: d.key, source: 'CANONICAL' } } },
        select: { id: true },
      });
    }

    const state = await tx.systemState.findUnique({ where: { id: 1 }, select: { id: true } });
    if (!state) await tx.systemState.create({ data: { id: 1 } });

    const settings = await tx.appSettings.findUnique({ where: { id: 1 }, select: { id: true } });
    if (!settings) await tx.appSettings.create({ data: { id: 1, data: toJson(DEFAULT_KPI_SETTINGS) } });

    return { designationsCreated: missing.length, systemStateCreated: !state, settingsCreated: !settings };
  });
}

import type { EngineerSeries } from '@/domain/kpi/dataset';
import { computeEngineerMetrics, type EngineerMetrics } from '@/domain/kpi/metrics';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { KpiSettings } from '@/domain/settings/kpi-settings';
import type { KpiReadRepository } from '@/application/ports/kpi';
import type { SettingsRepository } from '@/application/ports/settings';

export interface PopulationMember {
  readonly series: EngineerSeries;
  readonly metrics: EngineerMetrics;
}

export interface Population {
  readonly settings: KpiSettings;
  readonly allSprints: readonly SprintCode[];
  readonly sprints: readonly SprintCode[];
  readonly members: readonly PopulationMember[];
}

export interface RangeQuery {
  readonly from?: SprintCode;
  readonly to?: SprintCode;
}

/** Sprints in [from, to]; null when either bound is unknown or from > to. */
export function sprintRange(all: readonly SprintCode[], q: RangeQuery): SprintCode[] | null {
  if (all.length === 0) return q.from || q.to ? null : [];
  const start = q.from ? all.indexOf(q.from) : 0;
  const end = q.to ? all.indexOf(q.to) : all.length - 1;
  if (start < 0 || end < 0 || start > end) return null;
  return all.slice(start, end + 1);
}

/** Active engineers with metrics over a sprint range — the input of every server-side KPI view. */
export async function loadPopulation(kpi: KpiReadRepository, settingsRepo: SettingsRepository, q: RangeQuery): Promise<Population | null> {
  const [allSprints, settings] = await Promise.all([kpi.sprintCodes(), settingsRepo.get()]);
  const sprints = sprintRange(allSprints, q);
  if (!sprints) return null;
  const engineers = await kpi.matrix(sprints, false);
  return { settings, allSprints, sprints, members: engineers.map((series) => ({ series, metrics: computeEngineerMetrics(series.cells, settings) })) };
}

export const rankable = (m: PopulationMember) => ({ id: m.series.id, name: m.series.name, totalCenti: m.metrics.totalCenti, count: m.metrics.sprintsCounted });

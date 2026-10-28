import { designationRank } from '@/domain/kpi/dashboard';
import { computeEngineerMetrics } from '@/domain/kpi/metrics';
import { rankAll, rankByGroup, type RankResult } from '@/domain/kpi/ranking';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import { lastNWindow, sliceDataset } from '@/domain/kpi/window';
import { err, ok, type Result } from '@/domain/shared/result';
import type { KpiReadRepository } from '@/application/ports/kpi';
import type { SettingsRepository } from '@/application/ports/settings';
import { loadPopulation, rankable, type PopulationMember, type RangeQuery } from './kpi-population';

export type RankingScope = 'overall' | 'designation' | 'lastN';

export interface RankingRowDto {
  readonly rank: number | null;
  readonly employeeId: string;
  readonly name: string;
  readonly designation: string;
  readonly team: string;
  readonly sprints: number;
  readonly average: number | null;
  readonly total: number | null;
  readonly eligible: boolean;
}

export interface RankingsDto {
  readonly scope: RankingScope;
  readonly window: readonly SprintCode[];
  readonly minSprints: number;
  readonly groups: readonly { readonly key: string; readonly rows: readonly RankingRowDto[] }[];
}

function toRows(results: readonly RankResult[], byId: ReadonlyMap<string, PopulationMember>): RankingRowDto[] {
  return results.flatMap((r) => {
    const m = byId.get(r.id);
    if (!m) return [];
    return [{
      rank: r.rank, employeeId: r.id, name: m.series.name, designation: m.series.designation, team: m.series.team,
      sprints: m.metrics.sprintsCounted, average: m.metrics.average, total: m.metrics.total, eligible: r.eligible,
    }];
  });
}

/**
 * Server-computed rankings (US-06-02): overall, per designation (ranks restart)
 * and the last-N window, replacing the ranking blocks of the master sheet.
 */
export class GetRankings {
  constructor(private readonly deps: { readonly kpi: KpiReadRepository; readonly settings: SettingsRepository }) {}

  async execute(input: RangeQuery & { scope: RankingScope }): Promise<Result<RankingsDto, 'INVALID_RANGE'>> {
    const pop = await loadPopulation(this.deps.kpi, this.deps.settings, input);
    if (!pop) return err('INVALID_RANGE');
    const { settings } = pop;
    if (input.scope === 'lastN') {
      const window = lastNWindow({ sprints: pop.sprints, engineers: pop.members.map((m) => m.series) }, settings.lastNWindow);
      const sliced = sliceDataset({ sprints: pop.sprints, engineers: pop.members.map((m) => m.series) }, window);
      const members = sliced.engineers.map((series) => ({ series, metrics: computeEngineerMetrics(series.cells, settings) }));
      const byId = new Map(members.map((m) => [m.series.id, m]));
      return ok({ scope: 'lastN', window, minSprints: settings.lastNMinSprints, groups: [{ key: 'all', rows: toRows(rankAll(members.map(rankable), settings.lastNMinSprints), byId) }] });
    }
    const byId = new Map(pop.members.map((m) => [m.series.id, m]));
    const min = settings.rankEligibilityMinSprints;
    if (input.scope === 'designation') {
      const grouped = rankByGroup(pop.members.map((m) => ({ ...rankable(m), designation: m.series.designation })), (r) => r.designation, min);
      const groups = [...grouped]
        .sort(([a], [b]) => designationRank(a) - designationRank(b) || a.localeCompare(b))
        .map(([key, results]) => ({ key, rows: toRows(results, byId) }));
      return ok({ scope: 'designation', window: pop.sprints, minSprints: min, groups });
    }
    return ok({ scope: 'overall', window: pop.sprints, minSprints: min, groups: [{ key: 'all', rows: toRows(rankAll(pop.members.map(rankable), min), byId) }] });
  }
}

import { designationRank } from '@/domain/kpi/dashboard';
import { aggregateBy, overallWeightedAverage, sprintTrend, type GroupSummary, type SprintPoint } from '@/domain/kpi/groups';
import { rankAll } from '@/domain/kpi/ranking';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import { err, ok, type Result } from '@/domain/shared/result';
import type { KpiReadRepository } from '@/application/ports/kpi';
import type { SettingsRepository } from '@/application/ports/settings';
import { loadPopulation, rankable, type PopulationMember, type RangeQuery } from './kpi-population';

export interface TopRowDto {
  readonly rank: number;
  readonly employeeId: string;
  readonly name: string;
  readonly designation: string;
  readonly team: string;
  readonly sprints: number;
  readonly average: number;
}

export interface GroupSummariesDto {
  readonly sprints: readonly SprintCode[];
  readonly teams: readonly GroupSummary[];
  readonly designations: readonly GroupSummary[];
  readonly trend: readonly SprintPoint[];
  readonly topN: readonly TopRowDto[];
  readonly topNMinSprints: number;
  readonly headline: {
    readonly resources: number;
    readonly overallAvg: number | null;
    readonly latestSprint: SprintCode | null;
    readonly latestAvg: number | null;
    readonly latestCoverage: number | null;
  };
  readonly interpretation: string | null;
}

const two = (n: number) => n.toFixed(2);

function topN(members: readonly PopulationMember[], n: number, minSprints: number): TopRowDto[] {
  const byId = new Map(members.map((m) => [m.series.id, m]));
  return rankAll(members.map(rankable), minSprints)
    .filter((r) => r.rank !== null)
    .slice(0, n)
    .flatMap((r) => {
      const m = byId.get(r.id);
      return m && m.metrics.average !== null
        ? [{ rank: r.rank as number, employeeId: r.id, name: m.series.name, designation: m.series.designation, team: m.series.team, sprints: m.metrics.sprintsCounted, average: m.metrics.average }]
        : [];
    });
}

/**
 * Plain-English takeaways (US-06-03 AC-3), worded like the master sheet's
 * Performance Insights "Interpretation" cell.
 */
export function interpretation(top: readonly TopRowDto[], rawTop: TopRowDto | undefined, minSprints: number, team: GroupSummary | undefined, latest: SprintPoint | null): string | null {
  const established = top[0];
  if (!established || !rawTop || !team || !latest || latest.average === null) return null;
  return [
    `Top established performer (≥${minSprints} sprints): ${established.name} (${established.team}) at ${two(established.average)} over ${established.sprints} sprints.`,
    `Overall #1 by raw average: ${rawTop.name} at ${two(rawTop.average)} over ${rawTop.sprints} sprint(s).`,
    `Leading team: ${team.key} at ${two(team.weightedAverage ?? 0)}.`,
    `Latest sprint ${latest.sprint} averaged ${two(latest.average)} with ${Math.round(latest.coverage * 100)}% coverage.`,
  ].join(' ');
}

/** Team and designation summaries, sprint trend, Top-N and headline (US-06-03). */
export class GetGroupSummaries {
  constructor(private readonly deps: { readonly kpi: KpiReadRepository; readonly settings: SettingsRepository }) {}

  async execute(q: RangeQuery): Promise<Result<GroupSummariesDto, 'INVALID_RANGE'>> {
    const pop = await loadPopulation(this.deps.kpi, this.deps.settings, q);
    if (!pop) return err('INVALID_RANGE');
    const engineers = pop.members.map((m) => m.series);
    const teams = aggregateBy(engineers, (e) => e.team).sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.key.localeCompare(b.key));
    const designations = aggregateBy(engineers, (e) => e.designation).sort((a, b) => designationRank(a.key) - designationRank(b.key) || a.key.localeCompare(b.key));
    const trend = sprintTrend({ sprints: pop.sprints, engineers }, engineers.length);
    const latest = [...trend].reverse().find((p) => p.participants > 0) ?? null;
    const { topN: n, topNMinSprints } = pop.settings;
    const top = topN(pop.members, n, topNMinSprints);
    const rawTop = topN(pop.members, 1, 1)[0];
    return ok({
      sprints: pop.sprints,
      teams,
      designations,
      trend,
      topN: top,
      topNMinSprints,
      headline: {
        resources: engineers.length,
        overallAvg: overallWeightedAverage(engineers),
        latestSprint: latest?.sprint ?? null,
        latestAvg: latest?.average ?? null,
        latestCoverage: latest ? latest.coverage : null,
      },
      interpretation: interpretation(top, rawTop, topNMinSprints, teams[0], latest),
    });
  }
}

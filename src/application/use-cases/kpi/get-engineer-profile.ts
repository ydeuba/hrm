import { computeEngineerMetrics, type EngineerMetrics } from '@/domain/kpi/metrics';
import { sprintTrend } from '@/domain/kpi/groups';
import { rankAll, rankByGroup } from '@/domain/kpi/ranking';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { KpiSettings } from '@/domain/settings/kpi-settings';
import { err, ok, type Result } from '@/domain/shared/result';
import type { EmployeeDetail, EmployeeReadRepository } from '@/application/ports/employees';
import type { KpiReadRepository } from '@/application/ports/kpi';
import type { SettingsRepository } from '@/application/ports/settings';
import { periodLabels, type SprintRepository } from '@/application/ports/sprints';
import { compactCell } from './get-dashboard-dataset';
import { loadPopulation, rankable, type RangeQuery } from './kpi-population';

export interface EngineerProfileDto {
  readonly employee: Omit<EmployeeDetail, 'joiningDate'> & { readonly joiningDate: string | null };
  readonly metrics: EngineerMetrics;
  readonly overallRank: number | null;
  readonly rankOf: number;
  readonly designationRank: number | null;
  readonly designationSize: number;
  readonly sprints: readonly SprintCode[];
  readonly sprintLabels: Readonly<Record<string, string>>;
  readonly series: readonly {
    readonly sprint: SprintCode;
    readonly cell: number | 'R' | null;
    readonly stored: boolean;
    readonly orgAverage: number | null;
    readonly source: { readonly batchId: string; readonly fileName: string } | null;
  }[];
  readonly bands: KpiSettings['bands'];
}

/** Engineer drill-down (US-06-01/02): stats, ranks, per-sprint cells vs org average, score sources. */
export class GetEngineerProfile {
  constructor(private readonly deps: { readonly kpi: KpiReadRepository; readonly settings: SettingsRepository; readonly employees: EmployeeReadRepository; readonly sprints: SprintRepository }) {}

  async execute(input: RangeQuery & { id: string }): Promise<Result<EngineerProfileDto, 'NOT_FOUND' | 'INVALID_RANGE'>> {
    const employee = await this.deps.employees.detail(input.id);
    if (!employee) return err('NOT_FOUND');
    const pop = await loadPopulation(this.deps.kpi, this.deps.settings, input);
    if (!pop) return err('INVALID_RANGE');
    const [scoreSources, sprintRecords] = await Promise.all([this.deps.employees.scoreSources(input.id), this.deps.sprints.periods()]);
    const sources = new Map(scoreSources.map((s) => [s.sprint, s]));
    const cells = pop.sprints.map((sp) => sources.get(sp)?.cell ?? ({ kind: 'none' } as const));
    const overall = rankAll(pop.members.map(rankable), pop.settings.rankEligibilityMinSprints);
    const byDesignation = rankByGroup(pop.members.map((m) => ({ ...rankable(m), designation: m.series.designation })), (r) => r.designation, pop.settings.rankEligibilityMinSprints);
    const group = byDesignation.get(employee.designation.name) ?? [];
    const trend = sprintTrend({ sprints: pop.sprints, engineers: pop.members.map((m) => m.series) }, pop.members.length);
    return ok({
      employee: { ...employee, joiningDate: employee.joiningDate?.toISOString() ?? null },
      metrics: computeEngineerMetrics(cells, pop.settings),
      overallRank: overall.find((r) => r.id === employee.id)?.rank ?? null,
      rankOf: overall.filter((r) => r.rank !== null).length,
      designationRank: group.find((r) => r.id === employee.id)?.rank ?? null,
      designationSize: group.filter((r) => r.rank !== null).length,
      sprints: pop.sprints,
      sprintLabels: periodLabels(sprintRecords),
      series: pop.sprints.map((sprint, i) => {
        const src = sources.get(sprint);
        return {
          sprint,
          cell: compactCell(cells[i] ?? { kind: 'none' }),
          stored: Boolean(src),
          orgAverage: trend[i]?.average ?? null,
          source: src?.batchId && src.fileName ? { batchId: src.batchId, fileName: src.fileName } : null,
        };
      }),
      bands: pop.settings.bands,
    });
  }
}

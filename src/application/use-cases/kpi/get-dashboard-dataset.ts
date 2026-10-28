import { computeEngineerMetrics } from '@/domain/kpi/metrics';
import { rankAll } from '@/domain/kpi/ranking';
import type { ScoreCell } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { KpiSettings } from '@/domain/settings/kpi-settings';
import { err, ok, type Result } from '@/domain/shared/result';
import type { ImportBatchRepository } from '@/application/ports/imports';
import type { KpiReadRepository, MatrixQuery } from '@/application/ports/kpi';
import type { SettingsRepository } from '@/application/ports/settings';
import { periodLabels, type SprintRepository } from '@/application/ports/sprints';
import type { CellDto } from '../imports/preview-dto';
import { sprintRange } from './kpi-population';

export interface DatasetEngineerDto {
  readonly id: string;
  readonly name: string;
  readonly team: string;
  readonly designation: string;
  readonly status: 'ACTIVE' | 'INACTIVE';
  /** Compact cells aligned to `sprints` (ADR-009): score | 'R' (RUN) | null. */
  readonly cells: readonly (number | 'R' | null)[];
  readonly overallRank: number | null;
  readonly rankEligible: boolean;
}

export interface KpiDatasetDto {
  readonly revision: string;
  readonly range: { readonly from: SprintCode | null; readonly to: SprintCode | null };
  readonly allSprints: readonly SprintCode[];
  readonly sprints: readonly SprintCode[];
  /** "S138 · 06 Oct – 17 Oct 2026" for sprints with dates (US-03-07). */
  readonly sprintLabels: Readonly<Record<string, string>>;
  readonly engineers: readonly DatasetEngineerDto[];
  readonly activeCount: number;
  readonly settings: KpiSettings;
  readonly dataCheck: {
    readonly batchId: string;
    readonly items: readonly { name: string; kind: 'AVG' | 'TOTAL'; sheetValue: number | null; computedValue: number | null }[];
  } | null;
  readonly lastImport: { readonly id: string; readonly committedAt: string; readonly fileName: string } | null;
}

export const compactCell = (c: ScoreCell): number | 'R' | null => (c.kind === 'scored' ? c.centi / 100 : c.kind === 'run' ? 'R' : null);
export type { CellDto };

const CACHE_SIZE = 20;

/**
 * Server-authoritative dashboard dataset (US-04-05, ADR-009): score matrix for
 * a sprint range, overall ranks computed with the shared domain engine, the
 * data-check summary and settings. Memoised by revision + query.
 */
export class GetDashboardDataset {
  private readonly cache = new Map<string, KpiDatasetDto>();

  constructor(
    private readonly deps: {
      readonly kpi: KpiReadRepository;
      readonly settings: SettingsRepository;
      readonly batches: ImportBatchRepository;
      readonly sprints: SprintRepository;
    },
  ) {}

  async revisionKey(): Promise<string> {
    const r = await this.deps.kpi.revisions();
    return `${r.score}.${r.settings}`;
  }

  async execute(query: MatrixQuery): Promise<Result<KpiDatasetDto, 'INVALID_RANGE'>> {
    const revision = await this.revisionKey();
    const key = `${revision}|${query.from ?? ''}|${query.to ?? ''}|${query.includeInactive}`;
    const hit = this.cache.get(key);
    if (hit) return ok(hit);
    const all = await this.deps.kpi.sprintCodes();
    const sprints = sprintRange(all, query);
    if (!sprints) return err('INVALID_RANGE');
    const dto = await this.build(revision, all, sprints, query);
    this.cache.set(key, dto);
    if (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value as string);
    return ok(dto);
  }

  /** Explicit unknown sprints or from > to are invalid; no sprints at all is simply empty. */
  private async build(revision: string, all: SprintCode[], sprints: SprintCode[], q: MatrixQuery): Promise<KpiDatasetDto> {
    const [settings, engineers, latest, sprintRecords] = await Promise.all([
      this.deps.settings.get(),
      this.deps.kpi.matrix(sprints, q.includeInactive),
      this.deps.batches.latestCommittedRef(),
      this.deps.sprints.periods(),
    ]);
    const metrics = engineers.map((e) => ({ e, m: computeEngineerMetrics(e.cells, settings) }));
    const ranks = new Map(
      rankAll(metrics.filter((x) => x.e.active).map(({ e, m }) => ({ id: e.id, name: e.name, totalCenti: m.totalCenti, count: m.sprintsCounted })), settings.rankEligibilityMinSprints)
        .map((r) => [r.id, r]),
    );
    return {
      revision,
      range: { from: sprints[0] ?? null, to: sprints.at(-1) ?? null },
      allSprints: all,
      sprints,
      sprintLabels: periodLabels(sprintRecords),
      engineers: engineers.map((e) => ({
        id: e.id, name: e.name, team: e.team, designation: e.designation, status: e.active ? 'ACTIVE' : 'INACTIVE',
        cells: e.cells.map(compactCell), overallRank: ranks.get(e.id)?.rank ?? null, rankEligible: ranks.get(e.id)?.eligible ?? false,
      })),
      activeCount: engineers.filter((e) => e.active).length,
      settings,
      dataCheck: latest ? await this.dataCheck(latest.id) : null,
      lastImport: latest ? { id: latest.id, committedAt: latest.committedAt.toISOString(), fileName: latest.fileName } : null,
    };
  }

  private async dataCheck(batchId: string): Promise<KpiDatasetDto['dataCheck']> {
    const issues = await this.deps.batches.issuesFor(batchId);
    const items = issues
      .filter((i) => i.code === 'AVG_MISMATCH' || i.code === 'TOTAL_MISMATCH')
      .map((i) => ({ name: i.employeeName ?? '', kind: i.code === 'AVG_MISMATCH' ? ('AVG' as const) : ('TOTAL' as const), sheetValue: i.sheetValue ?? null, computedValue: i.computedValue ?? null }));
    return items.length ? { batchId, items } : null;
  }
}

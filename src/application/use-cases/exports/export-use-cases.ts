import { computeDashboard, toRows, type DashboardFilters, type RankedSeries } from '@/domain/kpi/dashboard';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { BandDef } from '@/domain/settings/kpi-settings';
import { err, ok, type Result } from '@/domain/shared/result';
import type { SpreadsheetWriter } from '@/application/ports/spreadsheet';
import type { GetDashboardDataset, KpiDatasetDto } from '../kpi/get-dashboard-dataset';
import type { GetRankings, RankingRowDto, RankingsDto } from '../kpi/get-rankings';
import { NOT_SCORED, RUN, scored } from '@/domain/kpi/score-cell';

export interface ExportFile {
  readonly fileName: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

const CONTENT_TYPE = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
} as const;

const r2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);
const stamp = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
const bandLabel = (key: string, bands: readonly BandDef[]) => bands.find((b) => b.key === key)?.label ?? 'N/A';

function decode(ds: KpiDatasetDto): RankedSeries[] {
  return ds.engineers.map((e) => ({
    id: e.id, name: e.name, team: e.team, designation: e.designation, active: e.status === 'ACTIVE', overallRank: e.overallRank,
    cells: e.cells.map((c) => (c === null ? NOT_SCORED : c === 'R' ? RUN : scored(c))),
  }));
}

const cellText = (c: number | 'R' | null) => (c === 'R' ? 'RUN' : c === null ? 'N/A' : c);

/**
 * Exports of exactly what the dashboard shows (US-07-02) and the rankings
 * workbook (US-07-03). Filenames: cloudtech-kpi_<from>-<to>_<yyyymmdd>.
 */
export class ExportKpi {
  constructor(
    private readonly deps: {
      readonly dataset: GetDashboardDataset;
      readonly rankings: GetRankings;
      readonly writer: SpreadsheetWriter;
      readonly clock: { now(): Date };
    },
  ) {}

  async engineers(input: { from?: SprintCode; to?: SprintCode; includeInactive: boolean; filters: DashboardFilters; format: 'xlsx' | 'csv' }): Promise<Result<ExportFile, 'INVALID_RANGE'>> {
    const ds = await this.deps.dataset.execute({ from: input.from, to: input.to, includeInactive: input.includeInactive });
    if (!ds.ok) return err('INVALID_RANGE');
    const d = ds.value;
    const engineers = decode(d);
    const view = computeDashboard(d.sprints, engineers, toRows(engineers, d.settings), input.filters);
    const cells = new Map(d.engineers.map((e) => [e.id, e.cells]));
    const header = ['Rank', 'Name', 'Team', 'Designation', 'Sprints', 'Total', 'Avg score', 'Last 3', 'Momentum', 'Rating', ...d.sprints];
    const body = [...view.rows]
      .sort((a, b) => (a.overallRank ?? 1e9) - (b.overallRank ?? 1e9) || a.name.localeCompare(b.name))
      .map((r) => [
        r.overallRank, r.name, r.team, r.designation, r.metrics.sprintsCounted, r2(r.metrics.total), r.metrics.displayAverage,
        r2(r.metrics.last3), r2(r.metrics.momentum), bandLabel(r.metrics.band, d.settings.bands), ...(cells.get(r.id) ?? []).map(cellText),
      ]);
    const bytes = this.deps.writer.write([{ name: 'Engineers', rows: [header, ...body] }], input.format);
    return ok({ fileName: `cloudtech-kpi_${d.range.from}-${d.range.to}_${stamp(this.deps.clock.now())}.${input.format}`, contentType: CONTENT_TYPE[input.format], bytes });
  }

  async rankings(input: { from?: SprintCode; to?: SprintCode }): Promise<Result<ExportFile, 'INVALID_RANGE'>> {
    const [overall, designation, lastN] = await Promise.all(SCOPES.map((scope) => this.deps.rankings.execute({ ...input, scope })));
    if (!overall?.ok || !designation?.ok || !lastN?.ok) return err('INVALID_RANGE');
    const bytes = this.deps.writer.write(rankingSheets(overall.value, designation.value, lastN.value), 'xlsx');
    const w = overall.value.window;
    return ok({ fileName: `cloudtech-kpi-rankings_${w[0] ?? ''}-${w.at(-1) ?? ''}_${stamp(this.deps.clock.now())}.xlsx`, contentType: CONTENT_TYPE.xlsx, bytes });
  }
}

const SCOPES = ['overall', 'designation', 'lastN'] as const;
const RANK_HEADER = ['Rank', 'Name', 'Designation', 'Team', 'Sprints', 'Avg score', 'Total', 'Eligible'];
const rankRow = (r: RankingRowDto) => [r.rank, r.name, r.designation, r.team, r.sprints, r2(r.average), r2(r.total), r.eligible ? 'Yes' : 'No'];

/** Same three views as the Rankings page (US-07-03 AC-1). */
function rankingSheets(overall: RankingsDto, designation: RankingsDto, lastN: RankingsDto) {
  const flat = (d: RankingsDto) => d.groups.flatMap((g) => g.rows).map(rankRow);
  return [
    { name: 'Overall', rows: [RANK_HEADER, ...flat(overall)] },
    { name: 'By designation', rows: [['Designation', ...RANK_HEADER], ...designation.groups.flatMap((g) => g.rows.map((r) => [g.key, ...rankRow(r)]))] },
    { name: `Last ${lastN.window.length} sprints`, rows: [RANK_HEADER, ...flat(lastN)] },
  ];
}

import type { BandKey, KpiSettings } from '../settings/kpi-settings';
import type { BandOrNone } from './bands';
import type { EngineerSeries } from './dataset';
import { aggregateBy, overallWeightedAverage, sprintTrend, type GroupSummary, type SprintPoint } from './groups';
import { computeEngineerMetrics, type EngineerMetrics } from './metrics';
import { isScored } from './score-cell';
import type { SprintCode } from './sprint-code';

/** Dashboard filters (US-05-02). Empty / undefined means "all". */
export interface DashboardFilters {
  readonly designation?: string;
  readonly team?: string;
  readonly band?: BandKey;
  readonly coverage?: 'all' | '10' | '6' | 'new';
  readonly q?: string;
}

export interface RankedSeries extends EngineerSeries {
  readonly overallRank: number | null;
}

export interface EngineerRow {
  readonly id: string;
  readonly name: string;
  readonly team: string;
  readonly designation: string;
  readonly overallRank: number | null;
  readonly metrics: EngineerMetrics;
}

export interface DashboardCards {
  readonly engineers: number;
  readonly orgAverage: number | null;
  readonly latestSprint: SprintCode | null;
  readonly latestAverage: number | null;
  readonly latestParticipants: number;
  readonly latestCoverage: number | null;
  readonly bands: Readonly<Record<BandKey, number>>;
}

export interface Mover {
  readonly id: string;
  readonly name: string;
  readonly momentum: number;
  readonly prior3: number;
  readonly last3: number;
}

export interface DashboardView {
  readonly rows: readonly EngineerRow[];
  readonly cards: DashboardCards;
  readonly byDesignation: readonly GroupSummary[];
  readonly byTeam: readonly GroupSummary[];
  readonly trend: readonly SprintPoint[];
  readonly movers: readonly Mover[];
}

/** Display order for designations (US-03-04 AC-1); unknown ones follow alphabetically. */
export const DESIGNATION_ORDER: readonly string[] = ['Team Lead', 'SSE', 'SE', 'ASE'];

const MAX_MOVERS_EACH_SIDE = 7;

function coverageMatches(sprints: number, coverage: DashboardFilters['coverage']): boolean {
  if (!coverage || coverage === 'all') return true;
  return coverage === 'new' ? sprints < 6 : sprints >= Number(coverage);
}

function matches(row: EngineerRow, f: DashboardFilters): boolean {
  const q = f.q?.trim().toLowerCase();
  return (
    (!f.designation || row.designation === f.designation) &&
    (!f.team || row.team === f.team) &&
    (!f.band || row.metrics.band === f.band) &&
    coverageMatches(row.metrics.sprintsCounted, f.coverage) &&
    (!q || row.name.toLowerCase().includes(q))
  );
}

export function designationRank(name: string): number {
  const i = DESIGNATION_ORDER.indexOf(name);
  return i < 0 ? DESIGNATION_ORDER.length : i;
}

function sortDesignations(groups: GroupSummary[]): GroupSummary[] {
  return groups.sort((a, b) => designationRank(a.key) - designationRank(b.key) || a.key.localeCompare(b.key));
}

function bandCounts(rows: readonly EngineerRow[]): Record<BandKey, number> {
  const counts: Record<BandKey, number> = { out: 0, exc: 0, meet: 0, ni: 0 };
  for (const r of rows) {
    const band: BandOrNone = r.metrics.band;
    if (band !== 'na') counts[band]++;
  }
  return counts;
}

/** Latest sprint with any score in the current view. */
function latestPoint(trend: readonly SprintPoint[]): SprintPoint | null {
  return [...trend].reverse().find((p) => p.participants > 0) ?? null;
}

export function moversOf(rows: readonly EngineerRow[]): Mover[] {
  const pool = rows
    .filter((r) => r.metrics.momentum !== null && r.metrics.prior3 !== null && r.metrics.last3 !== null)
    .map((r) => ({ id: r.id, name: r.name, momentum: r.metrics.momentum as number, prior3: r.metrics.prior3 as number, last3: r.metrics.last3 as number }))
    .sort((a, b) => b.momentum - a.momentum || a.name.localeCompare(b.name));
  return pool.length <= MAX_MOVERS_EACH_SIDE * 2 ? pool : [...pool.slice(0, MAX_MOVERS_EACH_SIDE), ...pool.slice(-MAX_MOVERS_EACH_SIDE)];
}

export function toRows(engineers: readonly RankedSeries[], settings: Pick<KpiSettings, 'bands' | 'momentumMinSprints'>): EngineerRow[] {
  return engineers.map((e) => ({
    id: e.id, name: e.name, team: e.team, designation: e.designation, overallRank: e.overallRank,
    metrics: computeEngineerMetrics(e.cells, settings),
  }));
}

/**
 * Everything the dashboard shows, from one filtered population (US-05-01…05).
 * Pure and isomorphic: the browser recomputes it on every filter change
 * (ADR-009). Group and org averages are weighted by score observations.
 */
export function computeDashboard(
  sprints: readonly SprintCode[],
  engineers: readonly RankedSeries[],
  allRows: readonly EngineerRow[],
  filters: DashboardFilters,
): DashboardView {
  const rows = allRows.filter((r) => matches(r, filters));
  const ids = new Set(rows.map((r) => r.id));
  const inView = engineers.filter((e) => ids.has(e.id));
  const trend = sprintTrend({ sprints, engineers: inView }, inView.length);
  const latest = latestPoint(trend);
  return {
    rows,
    cards: {
      engineers: rows.length,
      orgAverage: overallWeightedAverage(inView),
      latestSprint: latest?.sprint ?? null,
      latestAverage: latest?.average ?? null,
      latestParticipants: latest?.participants ?? 0,
      latestCoverage: latest ? latest.coverage : null,
      bands: bandCounts(rows),
    },
    byDesignation: sortDesignations(aggregateBy(inView, (e) => e.designation)),
    byTeam: aggregateBy(inView, (e) => e.team).sort((a, b) => (b.weightedAverage ?? -1) - (a.weightedAverage ?? -1) || a.key.localeCompare(b.key)),
    trend,
    movers: moversOf(rows),
  };
}

/** Distinct, sorted filter options from the dataset. */
export function filterOptions(engineers: readonly EngineerSeries[]) {
  const teams = [...new Set(engineers.map((e) => e.team))].sort((a, b) => a.localeCompare(b));
  const designations = [...new Set(engineers.map((e) => e.designation))].sort((a, b) => designationRank(a) - designationRank(b) || a.localeCompare(b));
  return { teams, designations };
}

/** True when at least one engineer has a scored cell. */
export function hasAnyScore(engineers: readonly EngineerSeries[]): boolean {
  return engineers.some((e) => e.cells.some(isScored));
}

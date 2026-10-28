import type { KpiDataset } from './dataset';
import { isScored } from './score-cell';
import type { SprintCode } from './sprint-code';

/** Indexes of sprints that have at least one scored cell. */
function sprintsWithData(ds: KpiDataset): number[] {
  return ds.sprints.flatMap((_, i) => (ds.engineers.some((e) => e.cells[i] && isScored(e.cells[i])) ? [i] : []));
}

/**
 * The most recent `n` sprints that have any score (US-04-04 AC-4), e.g.
 * S133–S138 for n = 6 on the master sheet. Empty placeholder sprints are skipped.
 */
export function lastNWindow(ds: KpiDataset, n: number): SprintCode[] {
  const idx = sprintsWithData(ds).slice(-Math.max(1, n));
  return idx.map((i) => ds.sprints[i]).filter((s): s is SprintCode => s !== undefined);
}

/** Restrict a dataset to the given sprints (order preserved from the dataset). */
export function sliceDataset(ds: KpiDataset, keep: readonly SprintCode[]): KpiDataset {
  const wanted = new Set(keep);
  const idx = ds.sprints.flatMap((s, i) => (wanted.has(s) ? [i] : []));
  return {
    sprints: idx.map((i) => ds.sprints[i]).filter((s): s is SprintCode => s !== undefined),
    engineers: ds.engineers.map((e) => ({ ...e, cells: idx.map((i) => e.cells[i] ?? { kind: 'none' as const }) })),
  };
}

/** Sprints from `from` to `to` inclusive (by position in the dataset). */
export function rangeOf(ds: KpiDataset, from?: SprintCode, to?: SprintCode): SprintCode[] {
  const start = from ? ds.sprints.indexOf(from) : 0;
  const end = to ? ds.sprints.indexOf(to) : ds.sprints.length - 1;
  if (start < 0 || end < 0 || start > end) return [];
  return ds.sprints.slice(start, end + 1);
}

/**
 * Rankings (US-04-04, ADR-016).
 *  - Rank numbers are competition ranks (1, 2, 2, 4) on the EXACT average,
 *    compared as integer cross-products — equal averages share a rank even
 *    when totals differ (matches the master sheet).
 *  - Display order within a tie: total desc, then name asc.
 *  - Engineers below `minSprints` (or with no scores) are not ranked.
 */
export interface Rankable {
  readonly id: string;
  readonly name: string;
  readonly totalCenti: number;
  readonly count: number;
}

export interface RankResult {
  readonly id: string;
  readonly rank: number | null;
  readonly eligible: boolean;
}

/** Negative when `a` has the higher exact average. Both counts must be > 0. */
export function compareAverageDesc(a: Rankable, b: Rankable): number {
  return b.totalCenti * a.count - a.totalCenti * b.count;
}

export function compareForDisplay(a: Rankable, b: Rankable): number {
  return compareAverageDesc(a, b) || b.totalCenti - a.totalCenti || a.name.localeCompare(b.name);
}

/** Rank one population; returns results in display order (eligible first, then ineligible by name). */
export function rankAll(rows: readonly Rankable[], minSprints: number): RankResult[] {
  const threshold = Math.max(1, minSprints);
  const eligible = rows.filter((r) => r.count >= threshold).sort(compareForDisplay);
  const ineligible = rows.filter((r) => r.count < threshold).sort((a, b) => a.name.localeCompare(b.name));
  const ranked: RankResult[] = [];
  let rank = 0;
  let previous: Rankable | undefined;
  eligible.forEach((row, i) => {
    if (!previous || compareAverageDesc(previous, row) !== 0) rank = i + 1;
    previous = row;
    ranked.push({ id: row.id, rank, eligible: true });
  });
  return [...ranked, ...ineligible.map((r) => ({ id: r.id, rank: null, eligible: false }))];
}

/** Rank within groups (e.g. per designation); ranks restart at 1 in each group. */
export function rankByGroup<T extends Rankable>(
  rows: readonly T[],
  groupOf: (row: T) => string,
  minSprints: number,
): Map<string, RankResult[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = groupOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return new Map([...groups].map(([key, members]) => [key, rankAll(members, minSprints)]));
}

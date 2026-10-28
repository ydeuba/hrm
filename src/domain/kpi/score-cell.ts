/**
 * One employee × sprint cell (ADR-004). Scores are integer hundredths ("centi")
 * so sums are exact; RUN and not-scored cells never count as zero.
 */
export type ScoreCell =
  | { readonly kind: 'scored'; readonly centi: number }
  | { readonly kind: 'run' }
  | { readonly kind: 'none' };

export const RUN: ScoreCell = Object.freeze({ kind: 'run' });
export const NOT_SCORED: ScoreCell = Object.freeze({ kind: 'none' });

export const MIN_SCORE = 0;
export const MAX_SCORE = 10;

/**
 * Convert a decimal score to hundredths, rounding half-up (ADR-016).
 * The epsilon fixes binary artefacts such as 1.005 * 100 = 100.4999….
 */
export function toCenti(value: number): number {
  return Math.round(value * 100 + 1e-7);
}

/** True when a value carries more than two decimals (e.g. 5.975). */
export function hasExtraPrecision(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) > 1e-9;
}

export function scored(value: number): ScoreCell {
  return { kind: 'scored', centi: toCenti(value) };
}

export function isScored(cell: ScoreCell): cell is { kind: 'scored'; centi: number } {
  return cell.kind === 'scored';
}

/** Hundredths of the scored cells, in order. */
export function scoredCenti(cells: readonly ScoreCell[]): number[] {
  return cells.filter(isScored).map((c) => c.centi);
}

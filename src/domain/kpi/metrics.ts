import type { KpiSettings } from '../settings/kpi-settings';
import { bandFor, type BandOrNone } from './bands';
import { scoredCenti, type ScoreCell } from './score-cell';

/**
 * One engineer's statistics over an ordered list of sprint cells (US-04-01).
 * Averages are exact; `displayAverage` is the 2-dp half-up value used for
 * bands and display (ADR-016). Values are numbers (score units), not centi.
 */
export interface EngineerMetrics {
  readonly sprintsCounted: number;
  readonly runSprints: number;
  readonly totalCenti: number;
  readonly total: number | null;
  readonly average: number | null;
  readonly displayAverage: number | null;
  readonly last3: number | null;
  readonly prior3: number | null;
  readonly momentum: number | null;
  readonly best: number | null;
  readonly worst: number | null;
  readonly spread: number | null;
  readonly band: BandOrNone;
}

type MetricSettings = Pick<KpiSettings, 'bands' | 'momentumMinSprints'>;

const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** 2-dp half-up rounding of an average expressed in centi. */
export function displayAverageOf(totalCenti: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round(totalCenti / count + 1e-9) / 100;
}

function populationSd(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/**
 * Momentum per the reference report: last 3 scored sprints vs the 3 before.
 * prior3 needs ≥ 4 scored sprints (averaging up to 3 earlier scores); momentum
 * needs ≥ momentumMinSprints (6 by default).
 */
function momentumOf(values: readonly number[], minSprints: number) {
  const last3 = values.length ? mean(values.slice(-3)) : null;
  const prior3 = values.length >= 4 ? mean(values.slice(-6, -3)) : null;
  const momentum = last3 !== null && prior3 !== null && values.length >= minSprints ? last3 - prior3 : null;
  return { last3, prior3, momentum };
}

export function computeEngineerMetrics(cells: readonly ScoreCell[], settings: MetricSettings): EngineerMetrics {
  const centi = scoredCenti(cells);
  const values = centi.map((c) => c / 100);
  const count = centi.length;
  const totalCenti = centi.reduce((a, b) => a + b, 0);
  const has = count > 0;
  const displayAverage = displayAverageOf(totalCenti, count);
  return {
    sprintsCounted: count,
    runSprints: cells.filter((c) => c.kind === 'run').length,
    totalCenti,
    total: has ? totalCenti / 100 : null,
    average: has ? totalCenti / count / 100 : null,
    displayAverage,
    ...momentumOf(values, settings.momentumMinSprints),
    best: has ? Math.max(...values) : null,
    worst: has ? Math.min(...values) : null,
    spread: populationSd(values),
    band: bandFor(displayAverage, settings.bands),
  };
}

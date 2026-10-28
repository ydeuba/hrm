import { describe, expect, it } from 'vitest';
import { computeDashboard, toRows, type RankedSeries } from '@/domain/kpi/dashboard';
import { NOT_SCORED, RUN, scored } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import { DEFAULT_KPI_SETTINGS } from '@/domain/settings/defaults';

/** E-04-07 AC-1 / NFR-03 — client-side recompute on every filter change. */
const ENGINEERS = 500;
const SPRINTS = 200;
const SAMPLES = 30;
const TEAMS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'];
const DESIGNATIONS = ['Team Lead', 'SSE', 'SE', 'ASE'];

const sprints = Array.from({ length: SPRINTS }, (_, i) => `S${i + 1}` as SprintCode);
const cell = (i: number, j: number) => {
  const k = (i * 7 + j * 13) % 100;
  if (k < 3) return RUN;
  if (k < 8) return NOT_SCORED;
  return scored(4 + ((i * 31 + j * 17) % 600) / 100);
};
const engineers: RankedSeries[] = Array.from({ length: ENGINEERS }, (_, i) => ({
  id: `e${i}`, name: `Engineer ${i}`, team: TEAMS[i % TEAMS.length] ?? 'Alpha', designation: DESIGNATIONS[i % DESIGNATIONS.length] ?? 'SE',
  active: true, overallRank: i + 1, cells: sprints.map((_, j) => cell(i, j)),
}));

const percentile = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.ceil(p * xs.length) - 1] ?? Infinity;

function measure(fn: () => unknown): { p50: number; p95: number } {
  fn(); // warm-up
  const ms = Array.from({ length: SAMPLES }, () => {
    const start = performance.now();
    fn();
    return performance.now() - start;
  });
  return { p50: percentile(ms, 0.5), p95: percentile(ms, 0.95) };
}

describe('computeDashboard performance', () => {
  const rows = toRows(engineers, DEFAULT_KPI_SETTINGS);

  it(`${ENGINEERS}×${SPRINTS}: computeDashboard p95 ≤ 100 ms (unfiltered and filtered)`, () => {
    const all = measure(() => computeDashboard(sprints, engineers, rows, {}));
    const filtered = measure(() => computeDashboard(sprints, engineers, rows, { team: 'Bravo', band: 'exc', q: 'engineer 1' }));
    const metrics = measure(() => toRows(engineers, DEFAULT_KPI_SETTINGS));
    console.log(`computeDashboard ${ENGINEERS}×${SPRINTS}: all p50=${all.p50.toFixed(1)} p95=${all.p95.toFixed(1)}ms · filtered p95=${filtered.p95.toFixed(1)}ms · toRows (load only) p95=${metrics.p95.toFixed(1)}ms`);
    expect(all.p95).toBeLessThanOrEqual(100);
    expect(filtered.p95).toBeLessThanOrEqual(100);
  });
});

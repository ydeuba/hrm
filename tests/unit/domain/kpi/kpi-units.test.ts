import { describe, expect, it } from 'vitest';
import boundary from '../../../fixtures/boundary-cases.json';
import { bandFor, validateBands } from '@/domain/kpi/bands';
import type { KpiDataset } from '@/domain/kpi/dataset';
import { aggregateBy, overallWeightedAverage, sprintTrend } from '@/domain/kpi/groups';
import { computeEngineerMetrics, displayAverageOf } from '@/domain/kpi/metrics';
import { rankAll, rankByGroup } from '@/domain/kpi/ranking';
import { hasExtraPrecision, isScored, NOT_SCORED, RUN, scored, scoredCenti, toCenti, type ScoreCell } from '@/domain/kpi/score-cell';
import { compareSprintCodes, parseSprintCode, sortSprintCodes, sprintNumber, type SprintCode } from '@/domain/kpi/sprint-code';
import { lastNWindow, rangeOf, sliceDataset } from '@/domain/kpi/window';
import { DEFAULT_KPI_SETTINGS } from '@/domain/settings/defaults';
import type { BandDef } from '@/domain/settings/kpi-settings';

const cellsOf = (xs: (number | string | null)[]): ScoreCell[] =>
  xs.map((v) => (typeof v === 'number' ? scored(v) : v === 'RUN' ? RUN : NOT_SCORED));
const metrics = (xs: (number | string | null)[]) => computeEngineerMetrics(cellsOf(xs), DEFAULT_KPI_SETTINGS);
const rankable = (id: string, xs: number[]) => {
  const m = metrics(xs);
  return { id, name: id, totalCenti: m.totalCenti, count: m.sprintsCounted };
};

describe('score cells (ADR-004/016)', () => {
  it('rounds half-up to centi including the 5.975 artefact', () => {
    expect(toCenti(boundary.precisionCell.raw)).toBe(boundary.precisionCell.expected.centi);
    // Real binary artefacts: 1.005 * 100 = 100.49999…, 2.135 * 100 = 213.49999…
    expect(Math.round(1.005 * 100)).toBe(100);
    expect(toCenti(1.005)).toBe(101);
    expect(toCenti(2.135)).toBe(214);
    expect(toCenti(8.33)).toBe(833);
    expect(toCenti(10)).toBe(1000);
  });

  it('detects values with more than two decimals', () => {
    expect(hasExtraPrecision(5.975)).toBe(true);
    expect(hasExtraPrecision(8.33)).toBe(false);
  });

  it('filters scored cells', () => {
    const cells = cellsOf([1, 'RUN', null, 2.5]);
    expect(cells.map(isScored)).toEqual([true, false, false, true]);
    expect(scoredCenti(cells)).toEqual([100, 250]);
  });
});

describe('sprint codes', () => {
  it('parses, orders numerically and de-duplicates', () => {
    expect(parseSprintCode(' s138 ')).toBe('S138');
    expect(parseSprintCode('Sprint 1')).toBeNull();
    expect(sprintNumber('S99')).toBe(99);
    expect(compareSprintCodes('S99', 'S100')).toBeLessThan(0);
    expect(sortSprintCodes(['S100', 'S99', 'S100'])).toEqual(['S99', 'S100']);
  });
});

describe('bands (E-04-02)', () => {
  const b = DEFAULT_KPI_SETTINGS.bands;
  it('AC-1: inclusive lower bounds', () => {
    expect([8, 7.99, 6, 5.99, 5, 4.99, 0].map((v) => bandFor(v, b))).toEqual(['out', 'exc', 'exc', 'meet', 'meet', 'ni', 'ni']);
    expect(bandFor(null, b)).toBe('na');
  });

  it('AC-2: an exact 7.995 average bands on its 2-dp value 8.00', () => {
    const c = boundary.bandFromTwoDecimalAverage;
    const m = metrics(c.cells);
    expect([m.total, m.average, m.displayAverage, m.band]).toEqual([c.expected.total, c.expected.exactAverage, c.expected.displayAverage, c.expected.band]);
    const below = metrics(boundary.bandJustBelowBoundary.cells);
    expect([below.displayAverage, below.band]).toEqual([0.0799 * 100, 'exc']);
  });

  it('returns na when no band covers the value', () => {
    expect(bandFor(-1, b)).toBe('na');
  });

  it('AC-3: validates order, range and labels', () => {
    expect(validateBands(b).ok).toBe(true);
    const mk = (mins: number[], labels = ['O', 'E', 'M', 'N']): BandDef[] =>
      (['out', 'exc', 'meet', 'ni'] as const).map((key, i) => ({ key, label: labels[i] ?? '', min: mins[i] ?? 0 }));
    expect(validateBands(mk([8, 8, 5, 0])).ok).toBe(false);
    expect(validateBands(mk([11, 6, 5, 0])).ok).toBe(false);
    expect(validateBands(mk([8, 6, 5, -1])).ok).toBe(false);
    expect(validateBands(mk([8, 6, 5, 0], ['O', ' ', 'M', 'N'])).ok).toBe(false);
    expect(validateBands([...mk([8, 6, 5, 0])].reverse()).ok).toBe(false);
  });
});

describe('metrics (E-04-01)', () => {
  it('excludes RUN and not-scored cells (run-only row)', () => {
    const c = boundary.runOnlyRow;
    const m = metrics(c.cells);
    expect({ sprintsCounted: m.sprintsCounted, runSprints: m.runSprints, total: m.total, average: m.average, band: m.band, last3: m.last3, momentum: m.momentum }).toEqual(c.expected);
    expect([m.best, m.worst, m.spread, m.displayAverage]).toEqual([null, null, null, null]);
  });

  it('single-sprint engineer', () => {
    const c = boundary.singleSprintEngineer;
    const m = metrics(c.cells);
    expect({
      sprintsCounted: m.sprintsCounted, runSprints: m.runSprints, total: m.total, average: m.average, last3: m.last3,
      prior3: m.prior3, momentum: m.momentum, best: m.best, worst: m.worst, spread: m.spread, band: m.band,
    }).toEqual(c.expected);
  });

  it('AC-2: momentum needs 6 scored sprints; prior3 needs 4', () => {
    expect(metrics([5, 6, 7, 8, 9]).momentum).toBeNull();
    expect(metrics([5, 6, 7, 8, 9]).prior3).toBeCloseTo(5.5);
    expect(metrics([5, 6, 7]).prior3).toBeNull();
    expect(metrics([5, 5, 5, 8, 8, 8]).momentum).toBeCloseTo(3);
  });

  it('displayAverageOf handles empty input', () => {
    expect(displayAverageOf(0, 0)).toBeNull();
    expect(displayAverageOf(1599, 2)).toBe(8);
  });
});

describe('ranking (E-04-03)', () => {
  it('AC-1: exact averages beat displayed ties', () => {
    const c = boundary.exactOrderingBeatsDisplayedTie;
    const res = rankAll(c.engineers.map((e) => rankable(e.name, e.cells)), 1);
    expect(res.map((r) => r.id)).toEqual(c.expectedOrder);
  });

  it('AC-2: competition ranking 1, 2, 2, 4', () => {
    const c = boundary.competitionRankingTie;
    const res = rankAll(c.engineers.map((e) => rankable(e.name, e.cells)), 1);
    expect(Object.fromEntries(res.map((r) => [r.id, r.rank]))).toEqual(c.expectedRanks);
  });

  it('equal averages share a rank even with different totals; display order by total', () => {
    const res = rankAll([rankable('one', [9.8]), rankable('five', [9.8, 9.8, 9.8, 9.8, 9.8]), rankable('low', [5])], 1);
    expect(res.map((r) => [r.id, r.rank])).toEqual([['five', 1], ['one', 1], ['low', 3]]);
  });

  it('AC-3: ineligible engineers are listed unranked; groups restart at 1', () => {
    const rows = [
      { ...rankable('a', [9, 9, 9, 9, 9]), d: 'SE' },
      { ...rankable('b', [10]), d: 'SE' },
      { ...rankable('c', [7, 7, 7, 7, 7]), d: 'ASE' },
      { ...rankable('z', []), d: 'ASE' },
    ];
    expect(rankAll(rows, 5)).toEqual([
      { id: 'a', rank: 1, eligible: true },
      { id: 'c', rank: 2, eligible: true },
      { id: 'b', rank: null, eligible: false },
      { id: 'z', rank: null, eligible: false },
    ]);
    const grouped = rankByGroup(rows, (r) => r.d, 1);
    expect(grouped.get('SE')?.map((r) => [r.id, r.rank])).toEqual([['b', 1], ['a', 2]]);
    expect(grouped.get('ASE')?.map((r) => [r.id, r.rank])).toEqual([['c', 1], ['z', null]]);
  });
});

describe('windows, groups and trend (E-04-03 AC-4, E-04-04)', () => {
  const ds: KpiDataset = {
    sprints: ['S1', 'S2', 'S3', 'S4'] as SprintCode[],
    engineers: [
      { id: 'a', name: 'a', team: 'T1', designation: 'SE', active: true, cells: cellsOf([8, 'RUN', 9, null]) },
      { id: 'b', name: 'b', team: 'T1', designation: 'SE', active: true, cells: cellsOf([6, null, 7]) },
      { id: 'c', name: 'c', team: 'T2', designation: 'ASE', active: true, cells: cellsOf([null, null, null, null]) },
    ],
  };

  it('last-N skips sprints without data and slices cells (missing cells become not-scored)', () => {
    expect(lastNWindow(ds, 2)).toEqual(['S1', 'S3']);
    expect(lastNWindow(ds, 0)).toEqual(['S3']);
    const sliced = sliceDataset(ds, ['S3', 'S4']);
    expect(sliced.sprints).toEqual(['S3', 'S4']);
    expect(sliced.engineers[1]?.cells).toEqual([{ kind: 'scored', centi: 700 }, { kind: 'none' }]);
  });

  it('rangeOf returns inclusive ranges and [] for invalid ones', () => {
    expect(rangeOf(ds)).toEqual(['S1', 'S2', 'S3', 'S4']);
    expect(rangeOf(ds, 'S2', 'S3')).toEqual(['S2', 'S3']);
    expect(rangeOf(ds, 'S3', 'S2')).toEqual([]);
    expect(rangeOf(ds, 'S9' as SprintCode)).toEqual([]);
  });

  it('weighted group averages count people with no scores but not their sprints', () => {
    const teams = aggregateBy(ds.engineers, (e) => e.team);
    expect(teams).toEqual([
      { key: 'T1', people: 2, scoreObs: 4, totalCenti: 3000, weightedAverage: 7.5, rank: 1 },
      { key: 'T2', people: 1, scoreObs: 0, totalCenti: 0, weightedAverage: null, rank: null },
    ]);
  });

  it('trend has gaps for empty sprints and coverage over the population', () => {
    const t = sprintTrend(ds, 3);
    expect(t.map((p) => [p.sprint, p.average, p.participants])).toEqual([['S1', 7, 2], ['S2', null, 0], ['S3', 8, 2], ['S4', null, 0]]);
    expect(t[0]?.coverage).toBeCloseTo(2 / 3);
    expect(sprintTrend(ds, 0)[0]?.coverage).toBe(0);
    expect(overallWeightedAverage(ds.engineers)).toBe(7.5);
    expect(overallWeightedAverage([])).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import workbook from '../../../fixtures/expected-workbook.json';
import reference from '../../../fixtures/reference-s122-s135.json';
import type { KpiDataset } from '@/domain/kpi/dataset';
import { aggregateBy, overallWeightedAverage, sprintTrend } from '@/domain/kpi/groups';
import { computeEngineerMetrics } from '@/domain/kpi/metrics';
import { rankAll, type Rankable } from '@/domain/kpi/ranking';
import { NOT_SCORED, RUN, scored, type ScoreCell } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import { lastNWindow, sliceDataset } from '@/domain/kpi/window';
import { DEFAULT_KPI_SETTINGS } from '@/domain/settings/defaults';

const close = (actual: number | null, expected: number | null, tol = 0.0100001) => {
  if (expected === null) return expect(actual).toBeNull();
  expect(actual).not.toBeNull();
  expect(Math.abs((actual ?? NaN) - expected)).toBeLessThanOrEqual(tol);
};

const toCell = (v: number | string | null | undefined): ScoreCell => {
  if (typeof v === 'number') return scored(v);
  return v === 'RUN' ? RUN : NOT_SCORED;
};

const sprints = workbook.sprints as SprintCode[];
const ds: KpiDataset = {
  sprints,
  engineers: workbook.employees.map((e) => ({
    id: e.name,
    name: e.name,
    team: e.team,
    designation: e.designation,
    active: true,
    cells: sprints.map((s) => toCell((e.cells as Record<string, number | string>)[s])),
  })),
};
const metricsOf = (d: KpiDataset) => new Map(d.engineers.map((e) => [e.id, computeEngineerMetrics(e.cells, DEFAULT_KPI_SETTINGS)]));
const rankables = (d: KpiDataset): Rankable[] => {
  const m = metricsOf(d);
  return d.engineers.map((e) => ({ id: e.id, name: e.name, totalCenti: m.get(e.id)?.totalCenti ?? 0, count: m.get(e.id)?.sprintsCounted ?? 0 }));
};

describe('golden: KPI Master Sheet (E-04-01, E-04-03, E-04-04)', () => {
  const metrics = metricsOf(ds);

  it('per-engineer total, average and sprint count match the sheet', () => {
    for (const e of workbook.employees) {
      const m = metrics.get(e.name);
      expect(m?.sprintsCounted, e.name).toBe(e.sprintsCounted);
      close(m?.total ?? null, e.sheetTotal);
      close(m?.average ?? null, e.sheetAverage);
    }
  });

  it('overall ranks equal the Compile Sheet "Overall Rankings" for all 49 employees', () => {
    const ranks = new Map(rankAll(rankables(ds), DEFAULT_KPI_SETTINGS.rankEligibilityMinSprints).map((r) => [r.id, r.rank]));
    const mismatches = workbook.employees.filter((e) => ranks.get(e.name) !== e.overallRank).map((e) => `${e.name}: ${ranks.get(e.name)} vs ${e.overallRank}`);
    expect(mismatches).toEqual([]);
    expect(ranks.get('Mandip Thapa')).toBeLessThan(ranks.get('Sajjan Khanal') ?? 0);
  });

  it('last-6 window is S133–S138 and last-N averages, counts and ranks match', () => {
    const win = lastNWindow(ds, DEFAULT_KPI_SETTINGS.lastNWindow);
    expect([win[0], win.at(-1), win.length]).toEqual([workbook.lastNWindow.from, workbook.lastNWindow.to, 6]);
    const sliced = sliceDataset(ds, win);
    const m = metricsOf(sliced);
    const ranks = new Map(rankAll(rankables(sliced), DEFAULT_KPI_SETTINGS.lastNMinSprints).map((r) => [r.id, r.rank]));
    for (const e of workbook.employees) {
      close(m.get(e.name)?.average ?? null, e.lastN.average);
      expect(m.get(e.name)?.sprintsCounted, e.name).toBe(e.lastN.sprints);
      expect(ranks.get(e.name), e.name).toBe(e.lastN.rank);
    }
  });

  it('team summaries match Performance Insights', () => {
    const teams = new Map(aggregateBy(ds.engineers, (e) => e.team).map((g) => [g.key, g]));
    for (const t of workbook.insights.teams) {
      const g = teams.get(t.team);
      expect([g?.people, g?.scoreObs, g?.rank], t.team).toEqual([t.people, t.scoreObs, t.rank]);
      close((g?.totalCenti ?? 0) / 100, t.totalScore);
      close(g?.weightedAverage ?? null, t.weightedAvg);
    }
  });

  it('designation summaries match Performance Insights', () => {
    const groups = new Map(aggregateBy(ds.engineers, (e) => e.designation).map((g) => [g.key, g]));
    for (const d of workbook.insights.designations) {
      const g = groups.get(d.designation);
      expect([g?.people, g?.scoreObs], d.designation).toEqual([d.people, d.scoreObs]);
      close(g?.weightedAverage ?? null, d.weightedAvg);
    }
  });

  it('sprint trend, participants, coverage and the headline match', () => {
    const trend = new Map(sprintTrend(ds, ds.engineers.length).map((p) => [p.sprint, p]));
    for (const t of workbook.insights.trend.filter((x) => sprints.includes(x.sprint as SprintCode))) {
      const p = trend.get(t.sprint as SprintCode);
      expect(p?.participants, t.sprint).toBe(t.participants);
      close(p?.average ?? null, t.average);
    }
    const h = workbook.insights.headline;
    close(trend.get('S138')?.coverage ?? null, h.latestCoverage, 0.0001);
    close(overallWeightedAverage(ds.engineers), h.overallAvg);
    expect(ds.engineers.length).toBe(h.resources);
  });
});

describe('golden: reference HTML S122–S135 (E-04-01 AC-3)', () => {
  const refSprints = reference.sprints as SprintCode[];
  it('total, average, last3, prior3, momentum, best, worst, spread and band match', () => {
    for (const r of reference.engineers) {
      const cells = refSprints.map((s) => toCell((r.scores as Record<string, number | null>)[s]));
      const m = computeEngineerMetrics(cells, DEFAULT_KPI_SETTINGS);
      expect(m.sprintsCounted, r.name).toBe(r.sprintsCounted);
      close(m.total, r.total);
      close(m.average, r.average);
      close(m.last3, r.last3);
      close(m.prior3, r.prior3);
      close(m.momentum, r.momentum);
      close(m.best, r.best);
      close(m.worst, r.worst);
      close(m.spread, r.spread);
      expect(m.band, r.name).toBe(r.band);
    }
  });
});

import { describe, expect, it } from 'vitest';
import workbook from '../../../fixtures/expected-workbook.json';
import { computeDashboard, designationRank, filterOptions, hasAnyScore, moversOf, toRows, type RankedSeries } from '@/domain/kpi/dashboard';
import { NOT_SCORED, RUN, scored, type ScoreCell } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import { DEFAULT_KPI_SETTINGS } from '@/domain/settings/defaults';

const toCell = (v: number | string | undefined): ScoreCell => (typeof v === 'number' ? scored(v) : v === 'RUN' ? RUN : NOT_SCORED);
const sprints = workbook.sprints as SprintCode[];
const engineers: RankedSeries[] = workbook.employees.map((e) => ({
  id: e.name, name: e.name, team: e.team, designation: e.designation, active: true, overallRank: e.overallRank,
  cells: sprints.map((s) => toCell((e.cells as Record<string, number | string>)[s])),
}));
const rows = toRows(engineers, DEFAULT_KPI_SETTINGS);
const view = (f = {}) => computeDashboard(sprints, engineers, rows, f);

describe('computeDashboard (E-05)', () => {
  it('E-05-01 AC-3: unfiltered cards match the workbook headline', () => {
    const v = view();
    const h = workbook.insights.headline;
    expect(v.cards.engineers).toBe(49);
    expect(v.cards.orgAverage).toBeCloseTo(h.overallAvg, 2);
    expect(v.cards.latestSprint).toBe('S138');
    expect(v.cards.latestAverage).toBeCloseTo(h.latestAvg, 2);
    expect(v.cards.latestParticipants).toBe(47);
    expect(v.cards.latestCoverage).toBeCloseTo(h.latestCoverage, 4);
    const b = v.cards.bands;
    expect(b.out + b.exc + b.meet + b.ni).toBe(49);
  });

  it('E-05-03: designation chart in TL/SSE/SE/ASE order; team chart sorted by weighted average', () => {
    const v = view();
    expect(v.byDesignation.map((g) => g.key)).toEqual(['Team Lead', 'SSE', 'SE', 'ASE']);
    expect(v.byDesignation.map((g) => g.people)).toEqual([6, 7, 16, 20]);
    expect(v.byTeam[0]?.key).toBe('DevOps');
    expect(v.trend.map((p) => p.sprint)).toEqual(sprints);
  });

  it('E-05-02 AC-1: filters combine with AND', () => {
    expect(view({ team: 'DevOps' }).cards.engineers).toBe(7);
    expect(view({ team: 'DevOps', designation: 'SE' }).rows.map((r) => r.name).sort()).toEqual(['Mandip Thapa', 'Sajjan Khanal']);
    expect(view({ q: 'joshi' }).rows.map((r) => r.name).sort()).toEqual(['Bishal Joshi', 'Jeevan Joshi', 'Surya joshi']);
    expect(view({ coverage: 'new' }).rows.every((r) => r.metrics.sprintsCounted < 6)).toBe(true);
    expect(view({ coverage: '10' }).rows.every((r) => r.metrics.sprintsCounted >= 10)).toBe(true);
    expect(view({ coverage: 'all' }).cards.engineers).toBe(49);
    const out = view({ band: 'out' });
    expect(out.rows.every((r) => r.metrics.band === 'out')).toBe(true);
    expect(out.cards.bands.exc).toBe(0);
  });

  it('a filter with no matches yields empty groups and null cards', () => {
    const v = view({ q: 'nobody-matches' });
    expect(v.rows).toEqual([]);
    expect([v.cards.orgAverage, v.cards.latestSprint, v.cards.latestCoverage, v.cards.latestParticipants]).toEqual([null, null, null, 0]);
    expect(v.byTeam).toEqual([]);
  });

  it('E-05-04 AC-1/AC-2: top 7 risers and bottom 7 decliners when more than 14 are eligible', () => {
    const m = view().movers;
    const eligible = rows.filter((r) => r.metrics.momentum !== null).length;
    expect(eligible).toBeGreaterThan(14);
    expect(m).toHaveLength(14);
    expect(m[0]?.momentum).toBeGreaterThanOrEqual(m[13]?.momentum ?? Infinity);
    const few = moversOf(rows.filter((r) => r.team === 'DevOps'));
    expect(few.length).toBeLessThanOrEqual(14);
    expect(few.every((x) => x.prior3 + x.momentum - x.last3 < 1e-9)).toBe(true);
  });

  it('options, ordering helpers and score detection', () => {
    const o = filterOptions(engineers);
    expect(o.designations).toEqual(['Team Lead', 'SSE', 'SE', 'ASE']);
    expect(o.teams).toHaveLength(8);
    expect(designationRank('Intern')).toBe(4);
    expect(hasAnyScore(engineers)).toBe(true);
    expect(hasAnyScore([{ ...(engineers[0] as RankedSeries), cells: [NOT_SCORED, RUN] }])).toBe(false);
  });

  it('equal momentum is ordered by name; teams without scores sort last', () => {
    const s = (vals: number[]) => vals.map((v) => scored(v));
    const tie: RankedSeries[] = [
      { id: 'b', name: 'Bravo', team: 'T2', designation: 'SE', active: true, overallRank: null, cells: s([5, 5, 5, 7, 7, 7]) },
      { id: 'a', name: 'Alpha', team: 'T1', designation: 'SE', active: true, overallRank: null, cells: s([6, 6, 6, 8, 8, 8]) },
      { id: 'e', name: 'Empty', team: 'T0', designation: 'SE', active: true, overallRank: null, cells: [NOT_SCORED, NOT_SCORED, NOT_SCORED, NOT_SCORED, NOT_SCORED, NOT_SCORED] },
      { id: 'z', name: 'Zed', team: 'T3', designation: 'SE', active: true, overallRank: null, cells: s([1, 1, 1, 1, 1, 1]) },
    ];
    const v = computeDashboard(['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], tie, toRows(tie, DEFAULT_KPI_SETTINGS), {});
    expect(v.movers.map((m) => m.name)).toEqual(['Alpha', 'Bravo', 'Zed']);
    expect(v.byTeam.map((g) => g.key)).toEqual(['T1', 'T2', 'T3', 'T0']);
  });

  it('unknown designations sort after the known ones, alphabetically', () => {
    const extra: RankedSeries[] = [
      { id: 'x', name: 'X', team: 'T', designation: 'QA', active: true, overallRank: null, cells: [scored(7)] },
      { id: 'y', name: 'Y', team: 'T', designation: 'BA', active: true, overallRank: null, cells: [scored(8)] },
      { id: 'z', name: 'Z', team: 'U', designation: 'SE', active: true, overallRank: null, cells: [NOT_SCORED] },
    ];
    const v = computeDashboard(['S1'], extra, toRows(extra, DEFAULT_KPI_SETTINGS), {});
    expect(v.byDesignation.map((g) => g.key)).toEqual(['SE', 'BA', 'QA']);
    expect(v.byTeam.map((g) => g.key)).toEqual(['T', 'U']);
    expect(filterOptions(extra).designations).toEqual(['SE', 'BA', 'QA']);
  });
});

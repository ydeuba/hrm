import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { buildReferenceExpectations, buildWorkbookExpectations } from '../../fixtures/golden-generator';
import expectedWorkbook from '../../fixtures/expected-workbook.json';
import reference from '../../fixtures/reference-s122-s135.json';
import boundary from '../../fixtures/boundary-cases.json';

const dir = path.resolve(__dirname, '../../fixtures');

describe('golden fixtures (E-00-06)', () => {
  it('AC-3: the generator reproduces the committed workbook expectations', () => {
    const regenerated = buildWorkbookExpectations(path.join(dir, 'kpi-master-sheet.xlsx'));
    expect(JSON.parse(JSON.stringify(regenerated))).toEqual(expectedWorkbook);
  });

  it('AC-3: the generator reproduces the committed reference-HTML expectations', () => {
    const regenerated = buildReferenceExpectations(path.join(dir, 'reference-dashboard-s122-s135.html'));
    expect(JSON.parse(JSON.stringify(regenerated))).toEqual(reference);
  });

  it('AC-1: workbook expectations cover all employees, sprints and insights', () => {
    expect(expectedWorkbook.employees).toHaveLength(49);
    expect(expectedWorkbook.sprints).toHaveLength(17);
    expect(expectedWorkbook.sprints[0]).toBe('S122');
    expect(expectedWorkbook.sprints.at(-1)).toBe('S138');
    expect(expectedWorkbook.emptySprintColumns).toEqual(['S139', 'S140', 'S141']);
    expect(expectedWorkbook.scoredCells).toBe(560);
    expect(expectedWorkbook.lastNWindow).toEqual({ size: 6, from: 'S133', to: 'S138' });
    for (const e of expectedWorkbook.employees) {
      expect(Number.isFinite(e.overallRank)).toBe(true);
      expect(Number.isFinite(e.lastN.average)).toBe(true);
    }
    expect(expectedWorkbook.insights.teams).toHaveLength(8);
    expect(expectedWorkbook.insights.designations).toHaveLength(4);
    expect(expectedWorkbook.insights.top10).toHaveLength(10);
    expect(expectedWorkbook.insights.headline.latestSprint).toBe('S138');
  });

  it('AC-2: reference expectations include metrics but never the stale rank', () => {
    expect(reference.engineers).toHaveLength(43);
    for (const e of reference.engineers) {
      expect(e).not.toHaveProperty('rank');
      expect(e).toHaveProperty('momentum');
      expect(e).toHaveProperty('spread');
      expect(e).toHaveProperty('band');
    }
  });

  it('AC-4: boundary fixtures cover the required edge cases', () => {
    expect(Object.keys(boundary)).toEqual(
      expect.arrayContaining([
        'bandFromTwoDecimalAverage',
        'exactOrderingBeatsDisplayedTie',
        'precisionCell',
        'runOnlyRow',
        'singleSprintEngineer',
        'competitionRankingTie',
      ]),
    );
    const byName = (n: string) => expectedWorkbook.employees.find((e) => e.name === n);
    expect(byName('Mandip Thapa')?.overallRank).toBeLessThan(byName('Sajjan Khanal')?.overallRank ?? 0);
    expect(byName('Bishal Joshi')?.cells.S122).toBe(boundary.precisionCell.raw);
  });
});

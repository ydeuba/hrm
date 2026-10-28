import { describe, expect, it } from 'vitest';
import { diffImport, type CurrentEmployee, type CurrentState, type LabelRef } from '@/domain/import/diff';
import { interpretMasterSheet, type ParsedMasterSheet } from '@/domain/import/master-sheet';
import { scored, RUN, NOT_SCORED, type ScoreCell } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import { editDistanceWithin } from '@/domain/shared/edit-distance';

function sheet(rows: (string | number | null)[][], header = ['Resources', 'Teams', 'Designation', 'S1', 'S2']): ParsedMasterSheet {
  const r = interpretMasterSheet([{ name: 'Compile Sheet', grid: [header, ...rows] }]);
  if (!r.ok) throw new Error('bad sheet');
  return r.value.sheet;
}

const emp = (id: string, name: string, extra: Partial<CurrentEmployee> = {}): CurrentEmployee => ({
  id, displayName: name, employeeCode: null, teamId: 't-run', teamName: 'Run Team', designationId: 'd-se', designationName: 'SE', teamLocked: false, designationLocked: false,
  aliases: [name.toLowerCase()], active: true, ...extra,
});

function state(employees: CurrentEmployee[], scores: [string, ScoreCell][] = [], sprints: SprintCode[] = []): CurrentState {
  const team: LabelRef = { id: 't-run', name: 'Run Team' };
  return {
    employees,
    teamAliases: new Map([['run team', team], ['run', team], ['devops', { id: 't-dev', name: 'DevOps' }]]),
    designationAliases: new Map([['se', { id: 'd-se', name: 'SE' }], ['sse', { id: 'd-sse', name: 'SSE' }]]),
    sprints: new Set(sprints),
    scores: new Map(scores),
  };
}

const opts = { notScoredOverwrites: true, merges: new Map<string, string>() };

describe('diffImport (E-02-04)', () => {
  it('first import into an empty DB: everyone and every score is new', () => {
    const d = diffImport(sheet([['Asha', 'Run Team', 'SE', 9, 'RUN'], ['Bina', 'New Team', 'Lead', 8, 7]]), state([]), opts);
    expect(d.summary).toEqual({ rows: 2, newEmployees: 2, matchedEmployees: 0, attributeChanges: 0, newSprints: 2, scoresAdded: 4, scoresChanged: 0, scoresUnchanged: 0, notInFile: 0 });
    expect(d.newTeams).toEqual(['New Team']);
    expect(d.newDesignations).toEqual(['Lead']);
    expect(d.newSprints).toEqual(['S1', 'S2']);
  });

  it('AC-1: matches by alias regardless of case/whitespace; unchanged scores are counted', () => {
    const current = state([emp('e1', 'Niva  Awale', { aliases: ['niva awale'] })], [['e1|S1', scored(9)]], ['S1']);
    const d = diffImport(sheet([['NIVA AWALE', 'Run Team', 'SE', 9, 8]]), current, opts);
    expect(d.plans[0]).toMatchObject({ employeeId: 'e1', updateTeam: false, updateDesignation: false, unchangedScores: 1 });
    expect(d.plans[0]?.scoreChanges).toEqual([{ sprint: 'S2', from: null, to: scored(8) }]);
    expect(d.summary).toMatchObject({ newEmployees: 0, matchedEmployees: 1, scoresAdded: 1, scoresUnchanged: 1, newSprints: 1 });
  });

  it('AC-2: flags near-duplicates (edit distance ≤ 2) and treats them as new unless confirmed', () => {
    const current = state([emp('e1', 'Surya Joshi')]);
    const s = sheet([['Surya Joshee', 'Run Team', 'SE', 9, null]]);
    const d = diffImport(s, current, opts);
    expect(d.nearDuplicates).toEqual([{ fileName: 'Surya Joshee', normalisedName: 'surya joshee', existingId: 'e1', existingName: 'Surya Joshi' }]);
    expect(d.plans[0]?.employeeId).toBeNull();
    expect(d.issues.map((i) => i.code)).toEqual(['NEAR_DUPLICATE']);
    const confirmed = diffImport(s, current, { ...opts, merges: new Map([['surya joshee', 'e1']]) });
    expect(confirmed.plans[0]).toMatchObject({ employeeId: 'e1', addAlias: true });
    expect(confirmed.nearDuplicates).toEqual([]);
  });

  it('AC-3: resolves teams and designations through aliases', () => {
    const current = state([emp('e1', 'Ram')]);
    const d = diffImport(sheet([['Ram', 'RUN', 'SE', 9, null]]), current, opts);
    expect(d.plans[0]?.team).toEqual({ kind: 'existing', id: 't-run', name: 'Run Team' });
    expect(d.plans[0]?.updateTeam).toBe(false);
    expect(d.newTeams).toEqual([]);
  });

  it('AC-4: team/designation changes, LOCKED_FIELD_DIFFERS, changed scores and not-in-file', () => {
    const current = state(
      [emp('e1', 'Ram'), emp('e2', 'Sita', { teamLocked: true }), emp('e3', 'Gone'), emp('e4', 'Inactive', { active: false })],
      [['e1|S1', scored(7)], ['e1|S2', RUN]],
      ['S1', 'S2'],
    );
    const d = diffImport(sheet([['Ram', 'DevOps', 'SSE', 8, 'RUN'], ['Sita', 'DevOps', 'SE', null, 6]]), current, opts);
    expect(d.plans[0]).toMatchObject({ updateTeam: true, updateDesignation: true, unchangedScores: 1 });
    expect(d.plans[0]?.scoreChanges).toEqual([{ sprint: 'S1', from: scored(7), to: scored(8) }]);
    expect(d.plans[1]).toMatchObject({ updateTeam: false, updateDesignation: false });
    expect(d.issues).toEqual([expect.objectContaining({ code: 'LOCKED_FIELD_DIFFERS', employeeName: 'Sita', column: 'Teams' })]);
    expect(d.notInFile).toEqual([{ id: 'e3', name: 'Gone' }]);
    expect(d.summary).toMatchObject({ attributeChanges: 1, scoresChanged: 1, notInFile: 1 });
  });

  it('locked designation is reported too; locked-but-equal fields are silent', () => {
    const current = state([emp('e1', 'Ram', { designationLocked: true, teamLocked: true })]);
    const d = diffImport(sheet([['Ram', 'Run Team', 'SSE', 8, null]]), current, opts);
    expect(d.issues.map((i) => i.column)).toEqual(['Designation']);
  });

  it('N/A in the file clears a stored score only when notScoredOverwrites is on', () => {
    const current = state([emp('e1', 'Ram')], [['e1|S1', scored(7)]], ['S1']);
    // Another row scores S1, so the column is kept (all-N/A columns are dropped as empty sprints).
    const s = sheet([['Ram', 'Run Team', 'SE', 'N/A', 9], ['Other', 'Run Team', 'SE', 5, null]]);
    expect(diffImport(s, current, opts).plans[0]?.scoreChanges).toContainEqual({ sprint: 'S1', from: scored(7), to: NOT_SCORED });
    expect(diffImport(s, current, { ...opts, notScoredOverwrites: false }).plans[0]?.scoreChanges.map((c) => c.sprint)).toEqual(['S2']);
  });

  it('AC-5: a name matching two employees is an AMBIGUOUS_NAME error; codes disambiguate', () => {
    const current = state([emp('e1', 'Bishal', { employeeCode: 'C1' }), emp('e2', 'Bishal', { employeeCode: 'C2' })]);
    const d = diffImport(sheet([['Bishal', 'Run Team', 'SE', 9, null]]), current, opts);
    expect(d.issues).toEqual([expect.objectContaining({ severity: 'error', code: 'AMBIGUOUS_NAME' })]);
    expect(d.plans).toHaveLength(0);
    const withCode = diffImport(sheet([['C2', 'Bishal', 'Run Team', 'SE', 9]], ['Code', 'Resources', 'Teams', 'Designation', 'S1']), current, opts);
    expect(withCode.plans[0]?.employeeId).toBe('e2');
  });

  it('rows without a team go to "Unassigned"', () => {
    const d = diffImport(sheet([['Ram', 'SE', 9]], ['Resources', 'Designation', 'S1']), state([]), opts);
    expect(d.plans[0]?.team).toEqual({ kind: 'new', name: 'Unassigned' });
  });
});

describe('editDistanceWithin', () => {
  it('returns the distance when within max, else null', () => {
    expect(editDistanceWithin('surya joshi', 'surya joshee', 2)).toBe(2);
    expect(editDistanceWithin('abc', 'abc', 2)).toBe(0);
    expect(editDistanceWithin('abc', 'xyz', 2)).toBeNull();
    expect(editDistanceWithin('a', 'abcdef', 2)).toBeNull();
    expect(editDistanceWithin('abcd', 'wxyz', 3)).toBeNull();
    expect(editDistanceWithin('kitten', 'sitting', 3)).toBe(3);
    // Every row stays within max but the final distance (2) exceeds it.
    expect(editDistanceWithin('aa', 'abb', 1)).toBeNull();
  });
});

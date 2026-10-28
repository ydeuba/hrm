import type { ScoreCell } from '../kpi/score-cell';
import type { SprintCode } from '../kpi/sprint-code';
import { editDistanceWithin } from '../shared/edit-distance';
import { normaliseName } from '../shared/name';
import type { ImportIssueDraft } from './issues';
import type { ParsedMasterSheet, ParsedRow } from './master-sheet';

/** What the database currently knows (loaded by the application layer). */
export interface CurrentEmployee {
  readonly id: string;
  readonly displayName: string;
  readonly employeeCode: string | null;
  readonly teamId: string;
  readonly teamName: string;
  readonly designationId: string;
  readonly designationName: string;
  readonly teamLocked: boolean;
  readonly designationLocked: boolean;
  /** Normalised aliases, including the canonical name. */
  readonly aliases: readonly string[];
  readonly active: boolean;
}

export interface LabelRef {
  readonly id: string;
  readonly name: string;
}

export interface CurrentState {
  readonly employees: readonly CurrentEmployee[];
  readonly teamAliases: ReadonlyMap<string, LabelRef>;
  readonly designationAliases: ReadonlyMap<string, LabelRef>;
  readonly sprints: ReadonlySet<SprintCode>;
  /** Key: `${employeeId}|${sprint}`. */
  readonly scores: ReadonlyMap<string, ScoreCell>;
}

export type LabelResolution = { readonly kind: 'existing'; readonly id: string; readonly name: string } | { readonly kind: 'new'; readonly name: string };

export interface ScoreChange {
  readonly sprint: SprintCode;
  readonly from: ScoreCell | null;
  readonly to: ScoreCell;
}

export interface RowPlan {
  readonly row: ParsedRow;
  /** null → a new employee is created. */
  readonly employeeId: string | null;
  readonly team: LabelResolution;
  readonly designation: LabelResolution;
  readonly updateTeam: boolean;
  readonly updateDesignation: boolean;
  readonly addAlias: boolean;
  readonly scoreChanges: readonly ScoreChange[];
  readonly unchangedScores: number;
}

export interface NearDuplicate {
  readonly fileName: string;
  readonly normalisedName: string;
  readonly existingId: string;
  readonly existingName: string;
}

export interface ImportDiff {
  readonly plans: readonly RowPlan[];
  readonly newTeams: readonly string[];
  readonly newDesignations: readonly string[];
  readonly newSprints: readonly SprintCode[];
  readonly notInFile: readonly LabelRef[];
  readonly nearDuplicates: readonly NearDuplicate[];
  readonly issues: readonly ImportIssueDraft[];
  readonly summary: DiffSummary;
}

export interface DiffSummary {
  readonly rows: number;
  readonly newEmployees: number;
  readonly matchedEmployees: number;
  readonly attributeChanges: number;
  readonly newSprints: number;
  readonly scoresAdded: number;
  readonly scoresChanged: number;
  readonly scoresUnchanged: number;
  readonly notInFile: number;
}

export interface DiffOptions {
  /** Store N/A from the file over an existing score (ADR-015 `importNotScoredOverwrites`). */
  readonly notScoredOverwrites: boolean;
  /** Confirmed near-duplicates: file normalised name → existing employee id. */
  readonly merges: ReadonlyMap<string, string>;
  readonly nearDuplicateDistance?: number;
}

const sameCell = (a: ScoreCell, b: ScoreCell) => a.kind === b.kind && (a.kind !== 'scored' || (b.kind === 'scored' && a.centi === b.centi));

function resolveLabel(name: string, aliases: ReadonlyMap<string, LabelRef>): LabelResolution {
  const hit = aliases.get(normaliseName(name));
  return hit ? { kind: 'existing', id: hit.id, name: hit.name } : { kind: 'new', name };
}

type Match = { kind: 'match'; employee: CurrentEmployee; viaMerge: boolean } | { kind: 'new' } | { kind: 'ambiguous'; count: number };

function matchEmployee(row: ParsedRow, state: CurrentState, merges: ReadonlyMap<string, string>): Match {
  const byCode = row.code ? state.employees.find((e) => e.employeeCode?.toLowerCase() === row.code?.toLowerCase()) : undefined;
  if (byCode) return { kind: 'match', employee: byCode, viaMerge: false };
  const byAlias = state.employees.filter((e) => e.aliases.includes(row.normalisedName));
  if (byAlias.length > 1) return { kind: 'ambiguous', count: byAlias.length };
  if (byAlias[0]) return { kind: 'match', employee: byAlias[0], viaMerge: false };
  const merged = state.employees.find((e) => e.id === merges.get(row.normalisedName));
  return merged ? { kind: 'match', employee: merged, viaMerge: true } : { kind: 'new' };
}

function scorePlan(row: ParsedRow, employeeId: string | null, sprints: readonly SprintCode[], state: CurrentState, opts: DiffOptions) {
  const changes: ScoreChange[] = [];
  let unchanged = 0;
  sprints.forEach((sprint, i) => {
    // Parsed rows always have one cell per sheet sprint.
    const to = row.cells[i] as ScoreCell;
    const from = employeeId ? state.scores.get(`${employeeId}|${sprint}`) ?? null : null;
    if (to.kind === 'none' && (!from || !opts.notScoredOverwrites)) return;
    if (from && sameCell(from, to)) unchanged++;
    else changes.push({ sprint, from, to });
  });
  return { changes, unchanged };
}

function lockIssue(row: ParsedRow, field: 'team' | 'designation', value: string): ImportIssueDraft {
  return {
    severity: 'warning', code: 'LOCKED_FIELD_DIFFERS', row: row.rowNumber, column: field === 'team' ? 'Teams' : 'Designation', employeeName: row.name,
    message: `${row.name}: file ${field} "${value}" ignored — the ${field} was set by HR and is locked`,
  };
}

interface FieldDecision {
  readonly update: boolean;
  readonly issue: ImportIssueDraft | null;
}

function fieldDecision(row: ParsedRow, field: 'team' | 'designation', res: LabelResolution, currentId: string, locked: boolean): FieldDecision {
  const differs = res.kind === 'new' || res.id !== currentId;
  if (!differs) return { update: false, issue: null };
  return locked ? { update: false, issue: lockIssue(row, field, res.name) } : { update: true, issue: null };
}

function nearDuplicatesFor(row: ParsedRow, state: CurrentState, max: number): NearDuplicate[] {
  return state.employees.flatMap((e) =>
    e.aliases.some((a) => editDistanceWithin(a, row.normalisedName, max) !== null)
      ? [{ fileName: row.name, normalisedName: row.normalisedName, existingId: e.id, existingName: e.displayName }]
      : [],
  );
}

interface Acc {
  plans: RowPlan[];
  issues: ImportIssueDraft[];
  nearDuplicates: NearDuplicate[];
  matched: Set<string>;
}

const NO_CHANGE: FieldDecision = { update: false, issue: null };

function attributeDecisions(row: ParsedRow, existing: CurrentEmployee | null, team: LabelResolution, designation: LabelResolution) {
  if (!existing) return { t: NO_CHANGE, d: NO_CHANGE };
  return {
    t: fieldDecision(row, 'team', team, existing.teamId, existing.teamLocked),
    d: fieldDecision(row, 'designation', designation, existing.designationId, existing.designationLocked),
  };
}

function planRow(row: ParsedRow, sheet: ParsedMasterSheet, state: CurrentState, opts: DiffOptions, acc: Acc): void {
  const match = matchEmployee(row, state, opts.merges);
  if (match.kind === 'ambiguous') {
    acc.issues.push({ severity: 'error', code: 'AMBIGUOUS_NAME', row: row.rowNumber, column: null, employeeName: row.name, message: `"${row.name}" matches ${match.count} employees — add an Employee Code column to the sheet` });
    return;
  }
  const existing = match.kind === 'match' ? match.employee : null;
  const team = resolveLabel(row.team || 'Unassigned', state.teamAliases);
  const designation = resolveLabel(row.designation, state.designationAliases);
  if (existing) acc.matched.add(existing.id);
  else acc.nearDuplicates.push(...nearDuplicatesFor(row, state, opts.nearDuplicateDistance ?? 2));
  const { t, d } = attributeDecisions(row, existing, team, designation);
  acc.issues.push(...[t.issue, d.issue].filter((i): i is ImportIssueDraft => i !== null));
  const employeeId = existing ? existing.id : null;
  const scores = scorePlan(row, employeeId, sheet.sprints, state, opts);
  acc.plans.push({
    row, employeeId, team, designation, updateTeam: t.update, updateDesignation: d.update,
    addAlias: match.kind === 'match' && match.viaMerge, scoreChanges: scores.changes, unchangedScores: scores.unchanged,
  });
}

function summarise(plans: readonly RowPlan[], newSprints: number, notInFile: number): DiffSummary {
  const changes = plans.flatMap((p) => p.scoreChanges);
  return {
    rows: plans.length,
    newEmployees: plans.filter((p) => p.employeeId === null).length,
    matchedEmployees: plans.filter((p) => p.employeeId !== null).length,
    attributeChanges: plans.filter((p) => p.updateTeam || p.updateDesignation).length,
    newSprints,
    scoresAdded: changes.filter((c) => c.from === null).length,
    scoresChanged: changes.filter((c) => c.from !== null).length,
    scoresUnchanged: plans.reduce((a, p) => a + p.unchangedScores, 0),
    notInFile,
  };
}

const uniqueNew = (rs: readonly LabelResolution[]) => [...new Map(rs.filter((r) => r.kind === 'new').map((r) => [normaliseName(r.name), r.name])).values()];

/**
 * Compare a parsed sheet with the current state (US-02-03, US-02-05, ADR-018):
 * match employees by code, then alias, then confirmed merge; resolve teams and
 * designations through aliases; respect HR field locks; plan score changes.
 * Sprints absent from the file and employees absent from the file are untouched.
 */
export function diffImport(sheet: ParsedMasterSheet, state: CurrentState, opts: DiffOptions): ImportDiff {
  const acc: Acc = { plans: [], issues: [], nearDuplicates: [], matched: new Set() };
  for (const row of sheet.rows) planRow(row, sheet, state, opts, acc);
  const newSprints = sheet.sprints.filter((s) => !state.sprints.has(s));
  const notInFile = state.employees.filter((e) => e.active && !acc.matched.has(e.id)).map((e) => ({ id: e.id, name: e.displayName }));
  for (const nd of acc.nearDuplicates) {
    acc.issues.push({ severity: 'warning', code: 'NEAR_DUPLICATE', row: null, column: null, employeeName: nd.fileName, message: `"${nd.fileName}" is new but resembles existing "${nd.existingName}" — confirm if it is the same person` });
  }
  return {
    plans: acc.plans,
    newTeams: uniqueNew(acc.plans.map((p) => p.team)),
    newDesignations: uniqueNew(acc.plans.map((p) => p.designation)),
    newSprints,
    notInFile,
    nearDuplicates: acc.nearDuplicates,
    issues: acc.issues,
    summary: summarise(acc.plans, newSprints.length, notInFile.length),
  };
}

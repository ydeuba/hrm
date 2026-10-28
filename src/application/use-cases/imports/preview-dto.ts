import type { ImportDiff } from '@/domain/import/diff';
import type { ImportIssueDraft } from '@/domain/import/issues';
import type { ParsedMasterSheet } from '@/domain/import/master-sheet';
import type { ScoreCell } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { CurrentEmployee } from '@/domain/import/diff';

/** Compact cell for the wire: score value, 'RUN', or null (not scored). */
export type CellDto = number | 'RUN' | null;

export const cellToDto = (c: ScoreCell | null): CellDto | 'ABSENT' => {
  if (c === null) return 'ABSENT';
  if (c.kind === 'scored') return c.centi / 100;
  return c.kind === 'run' ? 'RUN' : null;
};

export interface ImportIssueDto {
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly row: number | null;
  readonly column: string | null;
  readonly employeeName: string | null;
  readonly message: string;
  readonly sheetValue?: number;
  readonly computedValue?: number;
}

export interface PreviewSnapshot {
  readonly sheetName: string;
  readonly headerRow: number;
  readonly sprints: readonly SprintCode[];
  readonly emptySprints: readonly SprintCode[];
  readonly summary: ImportDiff['summary'] & { readonly errors: number; readonly warnings: number };
  readonly newEmployees: readonly { name: string; team: string; designation: string }[];
  readonly newTeams: readonly string[];
  readonly newDesignations: readonly string[];
  readonly attributeChanges: readonly { employeeId: string; name: string; field: 'team' | 'designation'; from: string; to: string }[];
  readonly scoreChanges: readonly { employeeId: string | null; name: string; sprint: SprintCode; from: CellDto | 'ABSENT'; to: CellDto | 'ABSENT' }[];
  readonly notInFile: readonly { employeeId: string; name: string }[];
  readonly nearDuplicates: readonly { fileName: string; existingEmployeeId: string; existingName: string }[];
}

export interface ImportPreviewDto extends PreviewSnapshot {
  readonly id: string;
  readonly status: string;
  readonly fileName: string;
  readonly fileHash: string;
  readonly sameAsBatch: { id: string; committedAt: string } | null;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly committedAt: string | null;
  readonly canCommit: boolean;
  readonly issues: readonly ImportIssueDto[];
}

function attributeChanges(diff: ImportDiff, byId: ReadonlyMap<string, CurrentEmployee>) {
  return diff.plans.flatMap((p) => {
    const e = p.employeeId ? byId.get(p.employeeId) : undefined;
    if (!e) return [];
    const out: PreviewSnapshot['attributeChanges'][number][] = [];
    if (p.updateTeam) out.push({ employeeId: e.id, name: e.displayName, field: 'team', from: e.teamName, to: p.team.name });
    if (p.updateDesignation) out.push({ employeeId: e.id, name: e.displayName, field: 'designation', from: e.designationName, to: p.designation.name });
    return out;
  });
}

export function buildSnapshot(
  sheet: ParsedMasterSheet,
  diff: ImportDiff,
  employees: readonly CurrentEmployee[],
  issues: readonly ImportIssueDraft[],
): PreviewSnapshot {
  const byId = new Map(employees.map((e) => [e.id, e]));
  return {
    sheetName: sheet.sheetName,
    headerRow: sheet.headerRow,
    sprints: sheet.sprints,
    emptySprints: sheet.emptySprints,
    summary: {
      ...diff.summary,
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
    },
    newEmployees: diff.plans.filter((p) => p.employeeId === null).map((p) => ({ name: p.row.name, team: p.team.name, designation: p.designation.name })),
    newTeams: diff.newTeams,
    newDesignations: diff.newDesignations,
    attributeChanges: attributeChanges(diff, byId),
    scoreChanges: diff.plans.flatMap((p) =>
      p.scoreChanges.map((c) => ({ employeeId: p.employeeId, name: p.row.name, sprint: c.sprint, from: cellToDto(c.from), to: cellToDto(c.to) })),
    ),
    notInFile: diff.notInFile.map((e) => ({ employeeId: e.id, name: e.name })),
    nearDuplicates: diff.nearDuplicates.map((n) => ({ fileName: n.fileName, existingEmployeeId: n.existingId, existingName: n.existingName })),
  };
}

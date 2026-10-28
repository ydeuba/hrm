import { err, ok, type Result } from '@/domain/shared/result';
import type { AuditLog } from '@/application/ports/audit-log';
import type { EmployeePatch, EmployeeWriteError, EmployeeWriteRepository, LabelKind, LabelRecord, LabelRepository } from '@/application/ports/employee-write';
import type { EmployeeDetail, EmployeeListItem, EmployeeListQuery, EmployeeReadRepository } from '@/application/ports/employees';

export interface EmployeeDto extends Omit<EmployeeDetail, 'joiningDate'> {
  readonly joiningDate: string | null;
  readonly sprintsScored?: number;
}

export const toEmployeeDto = (e: EmployeeDetail | EmployeeListItem): EmployeeDto => ({ ...e, joiningDate: e.joiningDate?.toISOString().slice(0, 10) ?? null });

/** Searchable, paginated employee list (US-03-01). */
export class ListEmployees {
  constructor(private readonly deps: { readonly employees: EmployeeReadRepository }) {}

  async execute(q: EmployeeListQuery): Promise<{ items: EmployeeDto[]; nextCursor: string | null }> {
    const res = await this.deps.employees.list(q);
    return { items: res.items.map(toEmployeeDto), nextCursor: res.nextCursor };
  }
}

/** One employee with aliases and lock state. */
export class GetEmployee {
  constructor(private readonly deps: { readonly employees: EmployeeReadRepository }) {}

  async execute(id: string): Promise<EmployeeDto | null> {
    const e = await this.deps.employees.detail(id);
    return e ? toEmployeeDto(e) : null;
  }
}

/** Only the fields that actually changed, for the audit before/after (US-03-02 AC-5). */
function changedFields(before: EmployeeDto, after: EmployeeDto): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const keys = ['displayName', 'employeeCode', 'email', 'joiningDate', 'status', 'teamLocked', 'designationLocked'] as const;
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const k of keys) {
    if (before[k] !== after[k]) {
      b[k] = before[k];
      a[k] = after[k];
    }
  }
  if (before.team.id !== after.team.id) [b.team, a.team] = [before.team.name, after.team.name];
  if (before.designation.id !== after.designation.id) [b.designation, a.designation] = [before.designation.name, after.designation.name];
  return { before: b, after: a };
}

/**
 * Edit an employee (US-03-02). A manual team/designation change locks that
 * field so later imports can't silently overwrite it (ADR-018); renames keep
 * the old spelling as an alias.
 */
export class UpdateEmployee {
  constructor(private readonly deps: { readonly writer: EmployeeWriteRepository; readonly audit: AuditLog }) {}

  async execute(input: { id: string; patch: EmployeePatch; actorId: string }): Promise<Result<EmployeeDto, EmployeeWriteError>> {
    const p = input.patch;
    const patch: EmployeePatch = {
      ...p,
      ...(p.teamId !== undefined && p.teamLocked === undefined ? { teamLocked: true } : {}),
      ...(p.designationId !== undefined && p.designationLocked === undefined ? { designationLocked: true } : {}),
    };
    const res = await this.deps.writer.update(input.id, patch);
    if (!res.ok) return err(res.error);
    const before = toEmployeeDto(res.before);
    const after = toEmployeeDto(res.after);
    const diff = changedFields(before, after);
    if (Object.keys(diff.after).length) {
      await this.deps.audit.record({ actorId: input.actorId, action: 'EMPLOYEE_UPDATE', entity: 'Employee', entityId: input.id, before: diff.before, after: diff.after });
    }
    return ok(after);
  }
}

/** Teams and designations: list with headcount; rename (old name kept as alias) and reorder (US-03-03). */
export class ManageLabels {
  constructor(private readonly deps: { readonly labels: LabelRepository; readonly audit: AuditLog }) {}

  list(kind: LabelKind): Promise<LabelRecord[]> {
    return this.deps.labels.list(kind);
  }

  async update(input: { kind: LabelKind; id: string; patch: { name?: string; sortOrder?: number }; actorId: string }): Promise<Result<LabelRecord, 'NOT_FOUND' | 'NAME_TAKEN'>> {
    const res = await this.deps.labels.update(input.kind, input.id, input.patch);
    if (!res.ok) return err(res.error);
    await this.deps.audit.record({
      actorId: input.actorId, action: 'LABEL_UPDATE', entity: input.kind === 'team' ? 'Team' : 'Designation', entityId: input.id,
      before: { name: res.before.name, sortOrder: res.before.sortOrder }, after: { name: res.after.name, sortOrder: res.after.sortOrder },
    });
    return ok(res.after);
  }
}

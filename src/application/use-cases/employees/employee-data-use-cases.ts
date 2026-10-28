import { describeCell, parseCorrection, type CorrectionInput } from '@/domain/kpi/score-correction';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import { normaliseName } from '@/domain/shared/name';
import { err, ok, type Result } from '@/domain/shared/result';
import type { AuditLog } from '@/application/ports/audit-log';
import type { ConflictPolicy, EmployeeDataRepository } from '@/application/ports/employee-write';
import type { EmployeeReadRepository } from '@/application/ports/employees';
import type { FileStore } from '@/application/ports/file-store';
import { toEmployeeDto, type EmployeeDto } from './employee-use-cases';

/** Merge a duplicate (source) into the correct employee (target) (US-03-04). */
export class MergeEmployees {
  constructor(private readonly deps: { readonly data: EmployeeDataRepository; readonly employees: EmployeeReadRepository; readonly audit: AuditLog }) {}

  async execute(input: { targetId: string; sourceId: string; policy: ConflictPolicy; actorId: string }): Promise<Result<EmployeeDto, 'SAME_EMPLOYEE' | 'NOT_FOUND'>> {
    if (input.targetId === input.sourceId) return err('SAME_EMPLOYEE');
    const res = await this.deps.data.merge(input.targetId, input.sourceId, input.policy);
    if (!res.ok) return err(res.error);
    await this.deps.audit.record({
      actorId: input.actorId, action: 'EMPLOYEE_MERGE', entity: 'Employee', entityId: input.targetId,
      meta: { sourceId: input.sourceId, sourceName: res.value.sourceName, policy: input.policy, moved: res.value.moved, conflicts: res.value.conflicts, aliasesMoved: res.value.aliasesMoved },
    });
    const target = await this.deps.employees.detail(input.targetId);
    return target ? ok(toEmployeeDto(target)) : err('NOT_FOUND');
  }
}

export type CorrectionError = 'OUT_OF_RANGE' | 'REASON_LENGTH' | 'NOT_FOUND' | 'UNKNOWN_SPRINT';

/** Fix one cell with a reason, audited (US-03-05). Bumps the revision, so earlier imports can't be rolled back. */
export class CorrectScore {
  constructor(private readonly deps: { readonly data: EmployeeDataRepository; readonly audit: AuditLog }) {}

  async execute(input: { employeeId: string; sprint: SprintCode; value: CorrectionInput; reason: string; actorId: string }): Promise<Result<void, CorrectionError>> {
    const parsed = parseCorrection(input.value, input.reason);
    if (!parsed.ok) return err(parsed.error);
    const res = await this.deps.data.correctScore(input.employeeId, input.sprint, parsed.value.cell);
    if (!res.ok) return err(res.error);
    await this.deps.audit.record({
      actorId: input.actorId, action: 'SCORE_CORRECT', entity: 'Score', entityId: `${input.employeeId}:${input.sprint}`,
      before: { sprint: input.sprint, value: describeCell(res.value.before) }, after: { sprint: input.sprint, value: describeCell(parsed.value.cell) },
      meta: { reason: parsed.value.reason },
    });
    return ok(undefined);
  }
}

/** Permanent erasure on request (US-03-06, ADR-017). The caller must type the exact display name. */
export class EraseEmployee {
  constructor(private readonly deps: { readonly data: EmployeeDataRepository; readonly employees: EmployeeReadRepository; readonly files: FileStore; readonly audit: AuditLog }) {}

  /** Facts for the confirmation dialog. */
  async preview(id: string): Promise<{ displayName: string; uploads: number } | null> {
    const e = await this.deps.employees.detail(id);
    return e ? { displayName: e.displayName, uploads: await this.deps.data.storedUploadCount() } : null;
  }

  async execute(input: { id: string; confirmName: string; actorId: string }): Promise<Result<{ uploadsDeleted: number }, 'NOT_FOUND' | 'CONFIRMATION_MISMATCH'>> {
    const e = await this.deps.employees.detail(input.id);
    if (!e) return err('NOT_FOUND');
    if (normaliseName(input.confirmName) !== normaliseName(e.displayName)) return err('CONFIRMATION_MISMATCH');
    const res = await this.deps.data.erase(input.id);
    if (!res.ok) return err(res.error);
    await Promise.all(res.value.uploadKeys.map((k) => this.deps.files.delete(k)));
    await this.deps.audit.record({ actorId: input.actorId, action: 'EMPLOYEE_ERASE', entity: 'Employee', entityId: input.id });
    return ok({ uploadsDeleted: res.value.uploadKeys.length });
  }
}

import 'server-only';
import type { EmployeePatch, EmployeeWriteError, EmployeeWriteRepository } from '@/application/ports/employee-write';
import type { EmployeeDetail } from '@/application/ports/employees';
import { displayName as tidy, normaliseName } from '@/domain/shared/name';
import type { Prisma } from '../../../../generated/prisma/client';
import type { Db } from '../prisma';
import { PrismaEmployeeRepository } from './prisma-employee-repository';

type Tx = Prisma.TransactionClient;

class WriteRejected extends Error {
  constructor(readonly code: EmployeeWriteError) {
    super(code);
  }
}

async function renameAliases(tx: Tx, id: string, newName: string): Promise<string> {
  const key = normaliseName(newName);
  const taken = await tx.employeeAlias.findUnique({ where: { normalisedName: key }, select: { employeeId: true } });
  if (taken && taken.employeeId !== id) throw new WriteRejected('NAME_TAKEN');
  await tx.employeeAlias.updateMany({ where: { employeeId: id, source: 'CANONICAL', normalisedName: { not: key } }, data: { source: 'RENAME' } });
  if (taken) await tx.employeeAlias.update({ where: { normalisedName: key }, data: { source: 'CANONICAL' }, select: { id: true } });
  else await tx.employeeAlias.create({ data: { employeeId: id, normalisedName: key, source: 'CANONICAL' }, select: { id: true } });
  return key;
}

async function assertRefs(tx: Tx, patch: EmployeePatch): Promise<void> {
  if (patch.teamId && !(await tx.team.findUnique({ where: { id: patch.teamId }, select: { id: true } }))) throw new WriteRejected('UNKNOWN_TEAM');
  if (patch.designationId && !(await tx.designation.findUnique({ where: { id: patch.designationId }, select: { id: true } }))) {
    throw new WriteRejected('UNKNOWN_DESIGNATION');
  }
  if (patch.employeeCode) {
    const holder = await tx.employee.findUnique({ where: { employeeCode: patch.employeeCode }, select: { id: true } });
    if (holder) throw new WriteRejected('DUPLICATE_CODE');
  }
}

function dataFor(patch: EmployeePatch, normalisedName: string | null): Prisma.EmployeeUncheckedUpdateInput {
  const pick = <K extends keyof EmployeePatch>(k: K) => (patch[k] === undefined ? {} : { [k]: patch[k] });
  return {
    ...(patch.displayName !== undefined && normalisedName ? { displayName: tidy(patch.displayName), normalisedName } : {}),
    ...pick('teamId'), ...pick('designationId'), ...pick('employeeCode'), ...pick('email'), ...pick('joiningDate'),
    ...pick('status'), ...pick('teamLocked'), ...pick('designationLocked'),
  };
}

/** Employee edits (US-03-02) with alias bookkeeping (ADR-018) in one transaction. */
export class PrismaEmployeeWriter implements EmployeeWriteRepository {
  private readonly reader: PrismaEmployeeRepository;

  constructor(private readonly db: Db) {
    this.reader = new PrismaEmployeeRepository(db);
  }

  async update(id: string, patch: EmployeePatch): Promise<{ ok: true; before: EmployeeDetail; after: EmployeeDetail } | { ok: false; error: EmployeeWriteError }> {
    const before = await this.reader.detail(id);
    if (!before) return { ok: false, error: 'NOT_FOUND' };
    const codeChanged = patch.employeeCode !== undefined && patch.employeeCode !== before.employeeCode;
    try {
      await this.db.$transaction(async (tx) => {
        await assertRefs(tx, { ...patch, employeeCode: codeChanged ? patch.employeeCode : undefined });
        const renamed = patch.displayName !== undefined && tidy(patch.displayName) !== before.displayName;
        const key = renamed ? await renameAliases(tx, id, patch.displayName as string) : null;
        await tx.employee.update({ where: { id }, data: dataFor(renamed ? patch : { ...patch, displayName: undefined }, key), select: { id: true } });
        await tx.systemState.update({ where: { id: 1 }, data: { scoreRevision: { increment: 1 } }, select: { id: true } });
      });
    } catch (error) {
      if (error instanceof WriteRejected) return { ok: false, error: error.code };
      throw error;
    }
    const after = await this.reader.detail(id);
    return after ? { ok: true, before, after } : { ok: false, error: 'NOT_FOUND' };
  }
}

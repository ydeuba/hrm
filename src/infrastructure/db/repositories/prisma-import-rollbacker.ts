import 'server-only';
import type { ImportRollbacker } from '@/application/use-cases/imports/rollback-import';
import { err, ok, type Result } from '@/domain/shared/result';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaAuditLog } from '../../audit/prisma-audit-log';
import type { Db } from '../prisma';
import type { ScoreStatusDb } from './score-mapping';

type Tx = Prisma.TransactionClient;

interface JournalRow {
  readonly entity: string;
  readonly entityKey: string;
  readonly op: 'CREATE' | 'UPDATE';
  readonly before: unknown;
}

class LaterChanges extends Error {}

const scoreKey = (key: string) => {
  const [employeeId = '', sprintId = ''] = key.split('|');
  return { employeeId, sprintId };
};

async function undoScore(tx: Tx, row: JournalRow): Promise<void> {
  const where = scoreKey(row.entityKey);
  if (row.op === 'CREATE') {
    await tx.score.deleteMany({ where });
    return;
  }
  const before = row.before as { status: ScoreStatusDb; valueCenti: number | null; sourceBatchId: string | null };
  await tx.score.update({ where: { employeeId_sprintId: where }, data: before, select: { status: true } });
}

async function undoEmployee(tx: Tx, row: JournalRow): Promise<void> {
  if (row.op === 'CREATE') {
    await tx.employee.deleteMany({ where: { id: row.entityKey } });
    return;
  }
  const before = row.before as { teamId: string; designationId: string };
  await tx.employee.update({ where: { id: row.entityKey }, data: before, select: { id: true } });
}

/** Undo of CREATE journal entries for rows that only ever get created by imports. */
const DELETERS: Record<string, (tx: Tx, id: string) => Promise<unknown>> = {
  EMPLOYEE_ALIAS: (tx, id) => tx.employeeAlias.deleteMany({ where: { id } }),
  TEAM_ALIAS: (tx, id) => tx.teamAlias.deleteMany({ where: { id } }),
  DESIGNATION_ALIAS: (tx, id) => tx.designationAlias.deleteMany({ where: { id } }),
  SPRINT: (tx, id) => tx.sprint.deleteMany({ where: { id } }),
  TEAM: (tx, id) => tx.team.deleteMany({ where: { id } }),
  DESIGNATION: (tx, id) => tx.designation.deleteMany({ where: { id } }),
};

async function undo(tx: Tx, row: JournalRow): Promise<void> {
  if (row.entity === 'SCORE') return undoScore(tx, row);
  if (row.entity === 'EMPLOYEE') return undoEmployee(tx, row);
  await DELETERS[row.entity]?.(tx, row.entityKey);
}

/**
 * Replays a batch's ImportChange journal in reverse inside one transaction,
 * guarded by the same conditional revision increment as the commit.
 */
export class PrismaImportRollbacker implements ImportRollbacker {
  constructor(private readonly db: Db) {}

  async rollback(input: { batchId: string; commitRevision: number; actorId: string; now: Date }): Promise<Result<void, 'CONFLICT_LATER_CHANGES'>> {
    try {
      await this.db.$transaction(
        async (tx) => {
          const guard = await tx.systemState.updateMany({ where: { id: 1, scoreRevision: input.commitRevision }, data: { scoreRevision: { increment: 1 } } });
          if (guard.count !== 1) throw new LaterChanges();
          const journal = await tx.importChange.findMany({
            where: { batchId: input.batchId },
            orderBy: { seq: 'desc' },
            select: { entity: true, entityKey: true, op: true, before: true },
          });
          for (const row of journal) await undo(tx, row);
          await tx.importBatch.update({ where: { id: input.batchId }, data: { status: 'ROLLED_BACK', rolledBackAt: input.now }, select: { id: true } });
          await new PrismaAuditLog(tx, { now: () => input.now }).record({
            actorId: input.actorId, action: 'IMPORT_ROLLBACK', entity: 'ImportBatch', entityId: input.batchId, meta: { changesReverted: journal.length },
          });
        },
        { timeout: 120_000, maxWait: 10_000 },
      );
      return ok(undefined);
    } catch (error) {
      if (error instanceof LaterChanges) return err('CONFLICT_LATER_CHANGES');
      throw error;
    }
  }
}

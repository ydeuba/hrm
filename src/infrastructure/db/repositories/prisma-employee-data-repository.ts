import 'server-only';
import type { ConflictPolicy, EmployeeDataRepository, ErasureOutcome, MergeOutcome } from '@/application/ports/employee-write';
import type { ScoreCell } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import { ERASED, erasureNeedles, jsonMentions, mentions, redactJson } from '@/domain/shared/redact';
import { err, ok, type Result } from '@/domain/shared/result';
import { Prisma } from '../../../../generated/prisma/client';
import { toJson } from '../json';
import type { Db } from '../prisma';
import { cellFromDb, cellToDb } from './score-mapping';

type Tx = Prisma.TransactionClient;

const bumpRevision = (tx: Tx) => tx.systemState.update({ where: { id: 1 }, data: { scoreRevision: { increment: 1 } }, select: { id: true } });

/** Redacted JSON for a nullable column (null stays SQL NULL). */
const redactedColumn = (v: unknown, needles: readonly string[]) => (v === null ? Prisma.DbNull : toJson(redactJson(v, needles)));

async function redactJournal(tx: Tx, needles: readonly string[]): Promise<number> {
  const rows = await tx.importChange.findMany({ select: { id: true, entityKey: true, before: true, after: true } });
  const hits = rows.filter((r) => mentions(r.entityKey, needles) || jsonMentions(r.before, needles) || jsonMentions(r.after, needles));
  for (const r of hits) {
    await tx.importChange.update({
      where: { id: r.id },
      data: { entityKey: mentions(r.entityKey, needles) ? ERASED : r.entityKey, before: redactedColumn(r.before, needles), after: toJson(redactJson(r.after, needles)) },
      select: { id: true },
    });
  }
  return hits.length;
}

async function redactIssues(tx: Tx, needles: readonly string[]): Promise<number> {
  const rows = await tx.importIssue.findMany({ select: { id: true, employeeName: true, message: true } });
  const hits = rows.filter((r) => mentions(r.employeeName ?? '', needles) || mentions(r.message, needles));
  for (const r of hits) {
    await tx.importIssue.update({ where: { id: r.id }, data: { employeeName: r.employeeName === null ? null : ERASED, message: ERASED }, select: { id: true } });
  }
  return hits.length;
}

/** Audit rows about the person (entityId = their ID, or `<id>:<sprint>` for scores) lose their whole payload. */
const aboutEmployee = (entityId: string | null, employeeId: string) => entityId === employeeId || Boolean(entityId?.startsWith(`${employeeId}:`));
const fullyErased = (v: unknown) => (v === null ? Prisma.DbNull : ERASED);

async function redactAudit(tx: Tx, employeeId: string, needles: readonly string[]): Promise<number> {
  const rows = await tx.auditEvent.findMany({ select: { id: true, entityId: true, before: true, after: true, meta: true } });
  const hits = rows.filter((r) => aboutEmployee(r.entityId, employeeId) || [r.before, r.after, r.meta].some((v) => jsonMentions(v, needles)));
  for (const r of hits) {
    const redact = aboutEmployee(r.entityId, employeeId) ? fullyErased : (v: unknown) => redactedColumn(v, needles);
    await tx.auditEvent.update({ where: { id: r.id }, data: { before: redact(r.before), after: redact(r.after), meta: redact(r.meta) }, select: { id: true } });
  }
  return hits.length;
}

/** Batch summaries/parsed rows hold names; stored originals are dropped entirely (ADR-017 step 4). */
async function redactBatches(tx: Tx, needles: readonly string[]): Promise<{ redacted: number; uploadKeys: string[] }> {
  const rows = await tx.importBatch.findMany({ select: { id: true, summary: true, parsed: true, fileKey: true } });
  const hits = rows.filter((r) => jsonMentions(r.summary, needles) || jsonMentions(r.parsed, needles));
  for (const r of hits) {
    await tx.importBatch.update({ where: { id: r.id }, data: { summary: toJson(redactJson(r.summary, needles)), parsed: redactedColumn(r.parsed, needles) }, select: { id: true } });
  }
  await tx.importBatch.updateMany({ where: { fileKey: { not: null } }, data: { fileKey: null } });
  return { redacted: hits.length, uploadKeys: [...new Set(rows.flatMap((r) => (r.fileKey ? [r.fileKey] : [])))] };
}

async function moveScores(tx: Tx, targetId: string, sourceId: string, policy: ConflictPolicy): Promise<{ moved: number; conflicts: number }> {
  const [source, target] = await Promise.all([
    tx.score.findMany({ where: { employeeId: sourceId }, select: { sprintId: true, status: true, valueCenti: true, sourceBatchId: true } }),
    tx.score.findMany({ where: { employeeId: targetId }, select: { sprintId: true } }),
  ]);
  const taken = new Set(target.map((s) => s.sprintId));
  const conflicts = source.filter((s) => taken.has(s.sprintId));
  if (policy === 'keepSource') {
    for (const c of conflicts) {
      await tx.score.update({
        where: { employeeId_sprintId: { employeeId: targetId, sprintId: c.sprintId } },
        data: { status: c.status, valueCenti: c.valueCenti, sourceBatchId: c.sourceBatchId },
        select: { sprintId: true },
      });
    }
  }
  await tx.score.deleteMany({ where: { employeeId: sourceId, sprintId: { in: conflicts.map((c) => c.sprintId) } } });
  const moved = await tx.score.updateMany({ where: { employeeId: sourceId }, data: { employeeId: targetId } });
  return { moved: moved.count, conflicts: conflicts.length };
}

/** Multi-table employee operations (US-03-04/05/06), each in one transaction. */
export class PrismaEmployeeDataRepository implements EmployeeDataRepository {
  constructor(private readonly db: Db) {}

  merge(targetId: string, sourceId: string, policy: ConflictPolicy): Promise<Result<MergeOutcome, 'NOT_FOUND'>> {
    return this.db.$transaction(async (tx) => {
      const [target, source] = await Promise.all([
        tx.employee.findUnique({ where: { id: targetId }, select: { id: true } }),
        tx.employee.findUnique({ where: { id: sourceId }, select: { displayName: true } }),
      ]);
      if (!target || !source) return err('NOT_FOUND' as const);
      const scores = await moveScores(tx, targetId, sourceId, policy);
      const aliases = await tx.employeeAlias.updateMany({ where: { employeeId: sourceId }, data: { employeeId: targetId, source: 'MERGE' } });
      await tx.employee.delete({ where: { id: sourceId }, select: { id: true } });
      await bumpRevision(tx);
      return ok({ sourceName: source.displayName, ...scores, aliasesMoved: aliases.count });
    });
  }

  async correctScore(employeeId: string, sprint: SprintCode, cell: ScoreCell): Promise<Result<{ before: ScoreCell | null }, 'NOT_FOUND' | 'UNKNOWN_SPRINT'>> {
    const [employee, sprintRow] = await Promise.all([
      this.db.employee.findUnique({ where: { id: employeeId }, select: { id: true } }),
      this.db.sprint.findUnique({ where: { code: sprint }, select: { id: true } }),
    ]);
    if (!employee) return err('NOT_FOUND');
    if (!sprintRow) return err('UNKNOWN_SPRINT');
    const key = { employeeId_sprintId: { employeeId, sprintId: sprintRow.id } };
    const value = { ...cellToDb(cell), sourceBatchId: null };
    return this.db.$transaction(async (tx) => {
      const existing = await tx.score.findUnique({ where: key, select: { status: true, valueCenti: true } });
      await tx.score.upsert({ where: key, create: { employeeId, sprintId: sprintRow.id, ...value }, update: value, select: { sprintId: true } });
      await bumpRevision(tx);
      return ok({ before: existing ? cellFromDb(existing.status, existing.valueCenti) : null });
    });
  }

  async storedUploadCount(): Promise<number> {
    const rows = await this.db.importBatch.findMany({ where: { fileKey: { not: null } }, select: { fileKey: true }, distinct: ['fileKey'] });
    return rows.length;
  }

  erase(employeeId: string): Promise<Result<ErasureOutcome, 'NOT_FOUND'>> {
    return this.db.$transaction(
      async (tx) => {
        const e = await tx.employee.findUnique({
          where: { id: employeeId },
          select: { displayName: true, normalisedName: true, employeeCode: true, email: true, aliases: { select: { normalisedName: true } } },
        });
        if (!e) return err('NOT_FOUND' as const);
        const needles = erasureNeedles([employeeId, e.displayName, e.normalisedName, e.employeeCode ?? '', e.email ?? '', ...e.aliases.map((a) => a.normalisedName)]);
        await tx.employee.delete({ where: { id: employeeId }, select: { id: true } });
        const counts = [await redactJournal(tx, needles), await redactIssues(tx, needles), await redactAudit(tx, employeeId, needles)];
        const batches = await redactBatches(tx, needles);
        await bumpRevision(tx);
        return ok({ uploadKeys: batches.uploadKeys, redacted: counts.reduce((a, b) => a + b, batches.redacted) });
      },
      { timeout: 60_000 },
    );
  }
}

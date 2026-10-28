import 'server-only';
import type { CommitOutcome, CommitRequest, ImportCommitter } from '@/application/ports/imports';
import type { LabelResolution, RowPlan } from '@/domain/import/diff';
import { sprintNumber, type SprintCode } from '@/domain/kpi/sprint-code';
import { normaliseName } from '@/domain/shared/name';
import { err, ok, type Result } from '@/domain/shared/result';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaAuditLog } from '../../audit/prisma-audit-log';
import { toJson } from '../json';
import type { Db } from '../prisma';
import { cellToDb } from './score-mapping';

type Tx = Prisma.TransactionClient;
type Entity = 'EMPLOYEE' | 'EMPLOYEE_ALIAS' | 'SCORE' | 'TEAM' | 'TEAM_ALIAS' | 'DESIGNATION' | 'DESIGNATION_ALIAS' | 'SPRINT';

class StalePreview extends Error {}

/** Collects rollback journal rows (ADR-007) and writes them in one batch at the end. */
class Journal {
  private readonly rows: Prisma.ImportChangeCreateManyInput[] = [];
  constructor(private readonly batchId: string) {}

  add(entity: Entity, entityKey: string, op: 'CREATE' | 'UPDATE', after: unknown, before?: unknown): void {
    this.rows.push({
      batchId: this.batchId, seq: this.rows.length + 1, entity, entityKey, op, after: toJson(after),
      before: before === undefined ? Prisma.DbNull : toJson(before),
    });
  }

  async flush(tx: Tx): Promise<void> {
    if (this.rows.length) await tx.importChange.createMany({ data: this.rows });
  }
}

type LabelKind = 'team' | 'designation';

async function createLabel(tx: Tx, kind: LabelKind, name: string, sortOrder: number, journal: Journal): Promise<string> {
  const key = normaliseName(name);
  const data = { name, sortOrder, aliases: { create: { normalisedName: key, source: 'CANONICAL' as const } } };
  const select = { id: true, aliases: { select: { id: true } } } as const;
  const created = kind === 'team' ? await tx.team.create({ data, select }) : await tx.designation.create({ data, select });
  journal.add(kind === 'team' ? 'TEAM' : 'DESIGNATION', created.id, 'CREATE', { id: created.id, name });
  journal.add(kind === 'team' ? 'TEAM_ALIAS' : 'DESIGNATION_ALIAS', created.aliases[0]?.id ?? '', 'CREATE', { normalisedName: key });
  return created.id;
}

async function nextSortOrder(tx: Tx, kind: LabelKind): Promise<number> {
  const agg = kind === 'team' ? await tx.team.aggregate({ _max: { sortOrder: true } }) : await tx.designation.aggregate({ _max: { sortOrder: true } });
  return (agg._max.sortOrder ?? 0) + 1;
}

async function ensureLabels(tx: Tx, kind: LabelKind, resolutions: readonly LabelResolution[], journal: Journal): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const r of resolutions) if (r.kind === 'existing') ids.set(normaliseName(r.name), r.id);
  let order = await nextSortOrder(tx, kind);
  for (const r of resolutions) {
    const key = normaliseName(r.name);
    if (!ids.has(key)) ids.set(key, await createLabel(tx, kind, r.name, order++, journal));
  }
  return ids;
}

async function ensureSprints(tx: Tx, sprints: readonly SprintCode[], journal: Journal): Promise<Map<SprintCode, string>> {
  const existing = await tx.sprint.findMany({ where: { code: { in: [...sprints] } }, select: { id: true, code: true } });
  const ids = new Map(existing.map((s) => [s.code as SprintCode, s.id]));
  for (const code of sprints.filter((s) => !ids.has(s))) {
    const created = await tx.sprint.create({ data: { code, number: sprintNumber(code) }, select: { id: true } });
    ids.set(code, created.id);
    journal.add('SPRINT', created.id, 'CREATE', { code });
  }
  return ids;
}

interface Ctx {
  readonly tx: Tx;
  readonly journal: Journal;
  readonly teams: Map<string, string>;
  readonly designations: Map<string, string>;
}

const labelId = (map: Map<string, string>, r: LabelResolution) => map.get(normaliseName(r.name)) as string;

async function createEmployee(ctx: Ctx, plan: RowPlan): Promise<string> {
  const { row } = plan;
  const data = {
    displayName: row.name, normalisedName: row.normalisedName, employeeCode: row.code,
    teamId: labelId(ctx.teams, plan.team), designationId: labelId(ctx.designations, plan.designation),
  };
  const created = await ctx.tx.employee.create({
    data: { ...data, aliases: { create: { normalisedName: row.normalisedName, source: 'CANONICAL' } } },
    select: { id: true, aliases: { select: { id: true } } },
  });
  ctx.journal.add('EMPLOYEE', created.id, 'CREATE', { id: created.id, ...data });
  ctx.journal.add('EMPLOYEE_ALIAS', created.aliases[0]?.id ?? '', 'CREATE', { normalisedName: row.normalisedName });
  return created.id;
}

async function updateEmployee(ctx: Ctx, plan: RowPlan, employeeId: string): Promise<void> {
  if (plan.updateTeam || plan.updateDesignation) {
    const before = await ctx.tx.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { teamId: true, designationId: true } });
    const after = {
      teamId: plan.updateTeam ? labelId(ctx.teams, plan.team) : before.teamId,
      designationId: plan.updateDesignation ? labelId(ctx.designations, plan.designation) : before.designationId,
    };
    await ctx.tx.employee.update({ where: { id: employeeId }, data: after, select: { id: true } });
    ctx.journal.add('EMPLOYEE', employeeId, 'UPDATE', after, before);
  }
  if (plan.addAlias) {
    const alias = await ctx.tx.employeeAlias.create({ data: { employeeId, normalisedName: plan.row.normalisedName, source: 'MERGE' }, select: { id: true } });
    ctx.journal.add('EMPLOYEE_ALIAS', alias.id, 'CREATE', { employeeId, normalisedName: plan.row.normalisedName });
  }
}

async function applyScores(ctx: Ctx, batchId: string, work: readonly { plan: RowPlan; employeeId: string }[], sprintIds: Map<SprintCode, string>) {
  const changes = work.flatMap(({ plan, employeeId }) =>
    plan.scoreChanges.map((c) => ({ employeeId, sprintId: sprintIds.get(c.sprint) as string, change: c })),
  );
  const updates = changes.filter((c) => c.change.from !== null);
  const previous = await ctx.tx.score.findMany({
    where: { OR: updates.map((u) => ({ employeeId: u.employeeId, sprintId: u.sprintId })) },
    select: { employeeId: true, sprintId: true, status: true, valueCenti: true, sourceBatchId: true },
  });
  const prevByKey = new Map(previous.map((p) => [`${p.employeeId}|${p.sprintId}`, p]));
  const creates = changes.filter((c) => c.change.from === null).map((c) => ({ employeeId: c.employeeId, sprintId: c.sprintId, sourceBatchId: batchId, ...cellToDb(c.change.to) }));
  if (creates.length) await ctx.tx.score.createMany({ data: creates });
  for (const c of creates) ctx.journal.add('SCORE', `${c.employeeId}|${c.sprintId}`, 'CREATE', c);
  for (const u of updates) {
    const key = `${u.employeeId}|${u.sprintId}`;
    const after = { ...cellToDb(u.change.to), sourceBatchId: batchId };
    await ctx.tx.score.update({ where: { employeeId_sprintId: { employeeId: u.employeeId, sprintId: u.sprintId } }, data: after, select: { status: true } });
    const p = prevByKey.get(key);
    ctx.journal.add('SCORE', key, 'UPDATE', after, { status: p?.status, valueCenti: p?.valueCenti ?? null, sourceBatchId: p?.sourceBatchId ?? null });
  }
}

/**
 * Atomic import commit (ADR-007): the conditional scoreRevision increment is
 * the first statement, so a concurrent commit or any edit since the preview
 * makes this transaction fail with CONFLICT_STALE_PREVIEW and write nothing.
 */
export class PrismaImportCommitter implements ImportCommitter {
  constructor(private readonly db: Db) {}

  async commit(req: CommitRequest): Promise<Result<CommitOutcome, 'CONFLICT_STALE_PREVIEW'>> {
    try {
      const commitRevision = await this.db.$transaction((tx) => this.run(tx, req), { timeout: 60_000, maxWait: 10_000 });
      return ok({ commitRevision });
    } catch (error) {
      if (error instanceof StalePreview) return err('CONFLICT_STALE_PREVIEW');
      throw error;
    }
  }

  private async run(tx: Tx, req: CommitRequest): Promise<number> {
    const guard = await tx.systemState.updateMany({ where: { id: 1, scoreRevision: req.baseRevision }, data: { scoreRevision: { increment: 1 } } });
    if (guard.count !== 1) throw new StalePreview();
    const journal = new Journal(req.batchId);
    const ctx: Ctx = {
      tx, journal,
      teams: await ensureLabels(tx, 'team', req.diff.plans.map((p) => p.team), journal),
      designations: await ensureLabels(tx, 'designation', req.diff.plans.map((p) => p.designation), journal),
    };
    const sprintIds = await ensureSprints(tx, req.sheet.sprints, journal);
    const work: { plan: RowPlan; employeeId: string }[] = [];
    for (const plan of req.diff.plans) {
      const employeeId = plan.employeeId ?? (await createEmployee(ctx, plan));
      if (plan.employeeId) await updateEmployee(ctx, plan, plan.employeeId);
      work.push({ plan, employeeId });
    }
    await applyScores(ctx, req.batchId, work, sprintIds);
    await journal.flush(tx);
    const commitRevision = req.baseRevision + 1;
    await tx.importBatch.update({
      where: { id: req.batchId },
      data: { status: 'COMMITTED', commitRevision, committedAt: req.now, parsed: Prisma.DbNull },
      select: { id: true },
    });
    await new PrismaAuditLog(tx, { now: () => req.now }).record({
      actorId: req.actorId, action: 'IMPORT_COMMIT', entity: 'ImportBatch', entityId: req.batchId, meta: { ...req.diff.summary, commitRevision },
    });
    return commitRevision;
  }
}

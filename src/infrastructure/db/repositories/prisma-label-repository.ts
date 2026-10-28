import 'server-only';
import type { LabelKind, LabelRecord, LabelRepository } from '@/application/ports/employee-write';
import { displayName as tidy, normaliseName } from '@/domain/shared/name';
import type { Prisma } from '../../../../generated/prisma/client';
import type { Db } from '../prisma';

type Tx = Prisma.TransactionClient;

interface Row {
  id: string;
  name: string;
  sortOrder: number;
  aliases: { normalisedName: string }[];
  _count: { employees: number };
}

const SELECT = { id: true, name: true, sortOrder: true, aliases: { select: { normalisedName: true } }, _count: { select: { employees: true } } } as const;
const ORDER = [{ sortOrder: 'asc' as const }, { name: 'asc' as const }];

const toRecord = (r: Row): LabelRecord => ({
  id: r.id, name: r.name, sortOrder: r.sortOrder, headcount: r._count.employees,
  aliases: r.aliases.map((a) => a.normalisedName).filter((a) => a !== normaliseName(r.name)).sort(),
});

/** Per-kind table access, so teams and designations share one algorithm without type casts. */
interface Strategy {
  list(db: Db): Promise<Row[]>;
  find(db: Db, id: string): Promise<Row | null>;
  aliasOwner(db: Db, key: string): Promise<string | null>;
  demoteCanonical(tx: Tx, id: string): Promise<unknown>;
  promoteAlias(tx: Tx, key: string): Promise<unknown>;
  createCanonical(tx: Tx, id: string, key: string): Promise<unknown>;
  updateLabel(tx: Tx, id: string, data: { name?: string; sortOrder?: number }): Promise<unknown>;
}

const STRATEGIES: Record<LabelKind, Strategy> = {
  team: {
    list: (db) => db.team.findMany({ orderBy: ORDER, select: SELECT }),
    find: (db, id) => db.team.findUnique({ where: { id }, select: SELECT }),
    aliasOwner: async (db, key) => (await db.teamAlias.findUnique({ where: { normalisedName: key }, select: { teamId: true } }))?.teamId ?? null,
    demoteCanonical: (tx, id) => tx.teamAlias.updateMany({ where: { teamId: id, source: 'CANONICAL' }, data: { source: 'RENAME' } }),
    promoteAlias: (tx, key) => tx.teamAlias.update({ where: { normalisedName: key }, data: { source: 'CANONICAL' }, select: { id: true } }),
    createCanonical: (tx, id, key) => tx.teamAlias.create({ data: { teamId: id, normalisedName: key, source: 'CANONICAL' }, select: { id: true } }),
    updateLabel: (tx, id, data) => tx.team.update({ where: { id }, data, select: { id: true } }),
  },
  designation: {
    list: (db) => db.designation.findMany({ orderBy: ORDER, select: SELECT }),
    find: (db, id) => db.designation.findUnique({ where: { id }, select: SELECT }),
    aliasOwner: async (db, key) => (await db.designationAlias.findUnique({ where: { normalisedName: key }, select: { designationId: true } }))?.designationId ?? null,
    demoteCanonical: (tx, id) => tx.designationAlias.updateMany({ where: { designationId: id, source: 'CANONICAL' }, data: { source: 'RENAME' } }),
    promoteAlias: (tx, key) => tx.designationAlias.update({ where: { normalisedName: key }, data: { source: 'CANONICAL' }, select: { id: true } }),
    createCanonical: (tx, id, key) => tx.designationAlias.create({ data: { designationId: id, normalisedName: key, source: 'CANONICAL' }, select: { id: true } }),
    updateLabel: (tx, id, data) => tx.designation.update({ where: { id }, data, select: { id: true } }),
  },
};

/**
 * Teams and designations (US-03-03). A rename keeps the old name as a RENAME
 * alias so imports using it still resolve (ADR-018). Changes bump
 * settingsRevision: names refresh in cached views without blocking rollback.
 */
export class PrismaLabelRepository implements LabelRepository {
  constructor(private readonly db: Db) {}

  async list(kind: LabelKind): Promise<LabelRecord[]> {
    return (await STRATEGIES[kind].list(this.db)).map(toRecord);
  }

  async update(kind: LabelKind, id: string, patch: { name?: string; sortOrder?: number }): Promise<{ ok: true; before: LabelRecord; after: LabelRecord } | { ok: false; error: 'NOT_FOUND' | 'NAME_TAKEN' }> {
    const s = STRATEGIES[kind];
    const row = await s.find(this.db, id);
    if (!row) return { ok: false, error: 'NOT_FOUND' };
    const name = patch.name === undefined ? undefined : tidy(patch.name);
    const renamed = name !== undefined && name !== row.name;
    const key = renamed ? normaliseName(name) : '';
    const owner = renamed ? await s.aliasOwner(this.db, key) : null;
    if (owner && owner !== id) return { ok: false, error: 'NAME_TAKEN' };
    await this.db.$transaction(async (tx) => {
      if (renamed) {
        await s.demoteCanonical(tx, id);
        await (owner ? s.promoteAlias(tx, key) : s.createCanonical(tx, id, key));
      }
      await s.updateLabel(tx, id, { ...(renamed ? { name } : {}), ...(patch.sortOrder === undefined ? {} : { sortOrder: patch.sortOrder }) });
      await tx.systemState.update({ where: { id: 1 }, data: { settingsRevision: { increment: 1 } }, select: { id: true } });
    });
    const after = await s.find(this.db, id);
    return after ? { ok: true, before: toRecord(row), after: toRecord(after) } : { ok: false, error: 'NOT_FOUND' };
  }
}

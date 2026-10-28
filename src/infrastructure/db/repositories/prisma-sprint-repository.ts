import 'server-only';
import type { SprintPeriod, SprintRecord, SprintRepository } from '@/application/ports/sprints';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { Db } from '../prisma';

const SELECT = { code: true, startDate: true, endDate: true, _count: { select: { scores: true } } } as const;

type Row = { code: string; startDate: Date | null; endDate: Date | null; _count: { scores: number } };
const toRecord = (r: Row): SprintRecord => ({ code: r.code as SprintCode, startDate: r.startDate, endDate: r.endDate, participants: r._count.scores });

export class PrismaSprintRepository implements SprintRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<SprintRecord[]> {
    const rows = await this.db.sprint.findMany({ orderBy: { number: 'asc' }, select: SELECT });
    return rows.map(toRecord);
  }

  async periods(): Promise<SprintPeriod[]> {
    const rows = await this.db.sprint.findMany({
      where: { OR: [{ startDate: { not: null } }, { endDate: { not: null } }] },
      orderBy: { number: 'asc' },
      select: { code: true, startDate: true, endDate: true },
    });
    return rows.map((r) => ({ ...r, code: r.code as SprintCode }));
  }

  setDates(code: SprintCode, startDate: Date | null, endDate: Date | null): Promise<{ before: SprintRecord; after: SprintRecord } | null> {
    return this.db.$transaction(async (tx) => {
      const before = await tx.sprint.findUnique({ where: { code }, select: SELECT });
      if (!before) return null;
      const after = await tx.sprint.update({ where: { code }, data: { startDate, endDate }, select: SELECT });
      await tx.systemState.update({ where: { id: 1 }, data: { settingsRevision: { increment: 1 } }, select: { id: true } });
      return { before: toRecord(before), after: toRecord(after) };
    });
  }
}

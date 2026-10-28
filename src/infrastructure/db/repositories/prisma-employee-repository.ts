import 'server-only';
import type { EmployeeDetail, EmployeeListItem, EmployeeListQuery, EmployeeReadRepository, ScoreSource } from '@/application/ports/employees';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import { normaliseName } from '@/domain/shared/name';
import type { Prisma } from '../../../../generated/prisma/client';
import type { Db } from '../prisma';
import { cellFromDb } from './score-mapping';

const DETAIL_SELECT = {
  id: true, displayName: true, normalisedName: true, employeeCode: true, email: true, joiningDate: true, status: true,
  teamLocked: true, designationLocked: true,
  team: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  aliases: { select: { normalisedName: true } },
} as const;

type DetailRow = Prisma.EmployeeGetPayload<{ select: typeof DETAIL_SELECT }>;

function toDetail(e: DetailRow): EmployeeDetail {
  return {
    id: e.id, displayName: e.displayName, employeeCode: e.employeeCode, email: e.email, joiningDate: e.joiningDate, status: e.status,
    team: e.team, designation: e.designation, teamLocked: e.teamLocked, designationLocked: e.designationLocked,
    aliases: e.aliases.map((a) => a.normalisedName).filter((a) => a !== e.normalisedName).sort(),
  };
}

function listWhere(q: EmployeeListQuery): Prisma.EmployeeWhereInput {
  const text = q.q ? normaliseName(q.q) : '';
  return {
    ...(q.teamId ? { teamId: q.teamId } : {}),
    ...(q.designationId ? { designationId: q.designationId } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(text ? { OR: [{ normalisedName: { contains: text } }, { employeeCode: { contains: q.q?.trim() } }] } : {}),
  };
}

export class PrismaEmployeeRepository implements EmployeeReadRepository {
  constructor(private readonly db: Db) {}

  async detail(id: string): Promise<EmployeeDetail | null> {
    const e = await this.db.employee.findUnique({ where: { id }, select: DETAIL_SELECT });
    return e ? toDetail(e) : null;
  }

  async scoreSources(id: string): Promise<ScoreSource[]> {
    const rows = await this.db.score.findMany({
      where: { employeeId: id },
      select: { status: true, valueCenti: true, sprint: { select: { code: true } }, sourceBatch: { select: { id: true, fileName: true } } },
    });
    return rows.map((r) => ({
      sprint: r.sprint.code as SprintCode,
      cell: cellFromDb(r.status, r.valueCenti),
      batchId: r.sourceBatch?.id ?? null,
      fileName: r.sourceBatch?.fileName ?? null,
    }));
  }

  async list(q: EmployeeListQuery): Promise<{ items: EmployeeListItem[]; nextCursor: string | null }> {
    const rows = await this.db.employee.findMany({
      where: listWhere(q),
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      select: { ...DETAIL_SELECT, _count: { select: { scores: { where: { status: 'SCORED' } } } } },
    });
    const items = rows.slice(0, q.limit).map((r) => ({ ...toDetail(r), sprintsScored: r._count.scores }));
    return { items, nextCursor: rows.length > q.limit ? (items.at(-1)?.id ?? null) : null };
  }
}

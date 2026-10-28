import 'server-only';
import type { KpiReadRepository, Revisions } from '@/application/ports/kpi';
import type { EngineerSeries } from '@/domain/kpi/dataset';
import { NOT_SCORED, type ScoreCell } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import { Prisma } from '../../../../generated/prisma/client';
import type { Db } from '../prisma';
import type { FastScoreReader } from '../sqlite-score-reader';
import { cellFromDb, type ScoreStatusDb } from './score-mapping';

interface ScoreRow {
  employeeId: string;
  sprintId: string;
  status: ScoreStatusDb;
  valueCenti: number | null;
}

/** Read model for KPI views; the score matrix is fetched in one query and pivoted in memory. */
export class PrismaKpiReadRepository implements KpiReadRepository {
  constructor(
    private readonly db: Db,
    private readonly fastReader: FastScoreReader | null = null,
  ) {}

  private async scoreRows(sprintIds: readonly string[], allSprints: boolean): Promise<ScoreRow[]> {
    if (sprintIds.length === 0) return [];
    if (this.fastReader) {
      return this.fastReader.read(allSprints ? null : sprintIds).map(([employeeId, sprintId, status, valueCenti]) => ({ employeeId, sprintId, status, valueCenti }));
    }
    // Portable fallback (PostgreSQL): one parameterised query.
    return this.db.$queryRaw<ScoreRow[]>(
      Prisma.sql`SELECT "employeeId", "sprintId", "status", "valueCenti" FROM "Score" WHERE "sprintId" IN (${Prisma.join([...sprintIds])})`,
    );
  }

  async revisions(): Promise<Revisions> {
    const s = await this.db.systemState.findUnique({ where: { id: 1 }, select: { scoreRevision: true, settingsRevision: true } });
    return { score: s?.scoreRevision ?? 0, settings: s?.settingsRevision ?? 0 };
  }

  async sprintCodes(): Promise<SprintCode[]> {
    const rows = await this.db.sprint.findMany({ orderBy: { number: 'asc' }, select: { code: true } });
    return rows.map((r) => r.code as SprintCode);
  }

  async matrix(sprints: readonly SprintCode[], includeInactive: boolean): Promise<EngineerSeries[]> {
    const [sprintCount, sprintRows, employees] = await Promise.all([
      this.db.sprint.count(),
      this.db.sprint.findMany({ where: { code: { in: [...sprints] } }, select: { id: true, code: true } }),
      this.db.employee.findMany({
        where: includeInactive ? {} : { status: 'ACTIVE' },
        orderBy: { displayName: 'asc' },
        select: { id: true, displayName: true, status: true, team: { select: { name: true } }, designation: { select: { name: true } } },
      }),
    ]);
    const column = new Map(sprintRows.map((s) => [s.id, sprints.indexOf(s.code as SprintCode)]));
    const scores = await this.scoreRows(sprintRows.map((s) => s.id), sprintRows.length === sprintCount);
    const cellsByEmployee = new Map<string, ScoreCell[]>(employees.map((e) => [e.id, sprints.map(() => NOT_SCORED)]));
    for (const s of scores) {
      const cells = cellsByEmployee.get(s.employeeId);
      const col = column.get(s.sprintId);
      if (cells && col !== undefined) cells[col] = cellFromDb(s.status, s.valueCenti);
    }
    return employees.map((e) => ({
      id: e.id, name: e.displayName, team: e.team.name, designation: e.designation.name, active: e.status === 'ACTIVE',
      cells: cellsByEmployee.get(e.id) ?? [],
    }));
  }
}

import 'server-only';
import type { ImportStateLoader } from '@/application/ports/imports';
import type { CurrentState, LabelRef } from '@/domain/import/diff';
import type { ScoreCell } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { Db } from '../prisma';
import { cellFromDb } from './score-mapping';

/** Loads the state the import diff compares against (one query per table, no N+1). */
export class PrismaImportStateLoader implements ImportStateLoader {
  constructor(private readonly db: Db) {}

  async scoreRevision(): Promise<number> {
    const s = await this.db.systemState.findUnique({ where: { id: 1 }, select: { scoreRevision: true } });
    return s?.scoreRevision ?? 0;
  }

  async load(sprints: readonly SprintCode[]): Promise<CurrentState> {
    const [employees, teamAliases, designationAliases, sprintRows] = await Promise.all([
      this.db.employee.findMany({
        select: {
          id: true, displayName: true, employeeCode: true, teamId: true, designationId: true, teamLocked: true, designationLocked: true, status: true,
          team: { select: { name: true } }, designation: { select: { name: true } }, aliases: { select: { normalisedName: true } },
        },
      }),
      this.db.teamAlias.findMany({ select: { normalisedName: true, team: { select: { id: true, name: true } } } }),
      this.db.designationAlias.findMany({ select: { normalisedName: true, designation: { select: { id: true, name: true } } } }),
      this.db.sprint.findMany({ select: { id: true, code: true } }),
    ]);
    const wanted = sprintRows.filter((s) => sprints.includes(s.code as SprintCode));
    const scoreRows = await this.db.score.findMany({
      where: { sprintId: { in: wanted.map((s) => s.id) } },
      select: { employeeId: true, sprintId: true, status: true, valueCenti: true },
    });
    const codeById = new Map(wanted.map((s) => [s.id, s.code]));
    const scores = new Map<string, ScoreCell>(
      scoreRows.map((r) => [`${r.employeeId}|${codeById.get(r.sprintId)}`, cellFromDb(r.status, r.valueCenti)]),
    );
    return {
      employees: employees.map((e) => ({
        id: e.id, displayName: e.displayName, employeeCode: e.employeeCode, teamId: e.teamId, teamName: e.team.name,
        designationId: e.designationId, designationName: e.designation.name, teamLocked: e.teamLocked, designationLocked: e.designationLocked,
        aliases: e.aliases.map((a) => a.normalisedName), active: e.status === 'ACTIVE',
      })),
      teamAliases: new Map<string, LabelRef>(teamAliases.map((a) => [a.normalisedName, a.team])),
      designationAliases: new Map<string, LabelRef>(designationAliases.map((a) => [a.normalisedName, a.designation])),
      sprints: new Set(sprintRows.map((s) => s.code as SprintCode)),
      scores,
    };
  }
}

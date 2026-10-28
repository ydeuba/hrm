import type { SprintCode } from '@/domain/kpi/sprint-code';
import { sprintPeriodLabel, validateSprintDates } from '@/domain/kpi/sprint-period';
import { err, ok, type Result } from '@/domain/shared/result';
import type { AuditLog } from '@/application/ports/audit-log';
import type { SprintRecord, SprintRepository } from '@/application/ports/sprints';

export interface SprintDto {
  readonly code: SprintCode;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly participants: number;
  readonly label: string;
}

const day = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;
const toDto = (s: SprintRecord): SprintDto => ({ code: s.code, startDate: day(s.startDate), endDate: day(s.endDate), participants: s.participants, label: sprintPeriodLabel(s.code, s.startDate, s.endDate) });

/** Sprint calendar dates (US-03-07). */
export class ManageSprints {
  constructor(private readonly deps: { readonly sprints: SprintRepository; readonly audit: AuditLog }) {}

  async list(): Promise<SprintDto[]> {
    return (await this.deps.sprints.list()).map(toDto);
  }

  async setDates(input: { code: SprintCode; startDate: Date | null; endDate: Date | null; actorId: string }): Promise<Result<SprintDto, 'END_BEFORE_START' | 'NOT_FOUND'>> {
    const valid = validateSprintDates(input.startDate, input.endDate);
    if (!valid.ok) return err(valid.error);
    const res = await this.deps.sprints.setDates(input.code, input.startDate, input.endDate);
    if (!res) return err('NOT_FOUND');
    const [before, after] = [toDto(res.before), toDto(res.after)];
    await this.deps.audit.record({
      actorId: input.actorId, action: 'SPRINT_UPDATE', entity: 'Sprint', entityId: input.code,
      before: { startDate: before.startDate, endDate: before.endDate }, after: { startDate: after.startDate, endDate: after.endDate },
    });
    return ok(after);
  }
}

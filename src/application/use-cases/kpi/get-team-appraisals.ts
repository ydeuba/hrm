import { err, ok, type Result } from '@/domain/shared/result';
import type { EmployeeReadRepository } from '@/application/ports/employees';
import type { LabelRepository } from '@/application/ports/employee-write';
import type { EngineerProfileDto, GetEngineerProfile } from './get-engineer-profile';

/** Upper bound on one batch print; a team is far smaller. */
const MAX_TEAM_SIZE = 500;

export interface TeamAppraisalsDto {
  readonly team: { readonly id: string; readonly name: string };
  readonly profiles: readonly EngineerProfileDto[];
}

/** Every active engineer's appraisal summary for one team, in name order (US-07-05). */
export class GetTeamAppraisals {
  constructor(private readonly deps: { readonly labels: LabelRepository; readonly employees: EmployeeReadRepository; readonly profile: GetEngineerProfile }) {}

  async execute(teamId: string): Promise<Result<TeamAppraisalsDto, 'NOT_FOUND'>> {
    const team = (await this.deps.labels.list('team')).find((t) => t.id === teamId);
    if (!team) return err('NOT_FOUND');
    const { items } = await this.deps.employees.list({ teamId, status: 'ACTIVE', limit: MAX_TEAM_SIZE });
    const results = await Promise.all(items.map((e) => this.deps.profile.execute({ id: e.id })));
    const profiles = results.flatMap((r) => (r.ok ? [r.value] : [])).sort((a, b) => a.employee.displayName.localeCompare(b.employee.displayName));
    return ok({ team: { id: team.id, name: team.name }, profiles });
  }
}

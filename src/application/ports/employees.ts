import type { ScoreCell } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';

export interface EmployeeDetail {
  readonly id: string;
  readonly displayName: string;
  readonly employeeCode: string | null;
  readonly email: string | null;
  readonly joiningDate: Date | null;
  readonly status: 'ACTIVE' | 'INACTIVE';
  readonly team: { readonly id: string; readonly name: string };
  readonly designation: { readonly id: string; readonly name: string };
  readonly teamLocked: boolean;
  readonly designationLocked: boolean;
  /** Normalised alternative spellings (excluding the canonical name). */
  readonly aliases: readonly string[];
}

export interface ScoreSource {
  readonly sprint: SprintCode;
  readonly cell: ScoreCell;
  readonly batchId: string | null;
  readonly fileName: string | null;
}

export interface EmployeeListQuery {
  readonly q?: string;
  readonly teamId?: string;
  readonly designationId?: string;
  readonly status?: 'ACTIVE' | 'INACTIVE';
  readonly cursor?: string;
  readonly limit: number;
}

export interface EmployeeListItem extends EmployeeDetail {
  readonly sprintsScored: number;
}

export interface EmployeeReadRepository {
  detail(id: string): Promise<EmployeeDetail | null>;
  /** Every stored cell for the employee with the import that last wrote it. */
  scoreSources(id: string): Promise<ScoreSource[]>;
  list(query: EmployeeListQuery): Promise<{ items: EmployeeListItem[]; nextCursor: string | null }>;
}

import type { ScoreCell } from '@/domain/kpi/score-cell';
import type { SprintCode } from '@/domain/kpi/sprint-code';
import type { Result } from '@/domain/shared/result';
import type { EmployeeDetail } from './employees';

export interface EmployeePatch {
  readonly displayName?: string;
  readonly teamId?: string;
  readonly designationId?: string;
  readonly employeeCode?: string | null;
  readonly email?: string | null;
  readonly joiningDate?: Date | null;
  readonly status?: 'ACTIVE' | 'INACTIVE';
  readonly teamLocked?: boolean;
  readonly designationLocked?: boolean;
}

export type EmployeeWriteError = 'NOT_FOUND' | 'NAME_TAKEN' | 'DUPLICATE_CODE' | 'UNKNOWN_TEAM' | 'UNKNOWN_DESIGNATION';

export interface EmployeeWriteRepository {
  /**
   * Apply a patch atomically. A rename adds the new canonical alias and keeps
   * the old one as RENAME (ADR-018). Bumps scoreRevision (edits block rollback).
   */
  update(id: string, patch: EmployeePatch): Promise<{ ok: true; before: EmployeeDetail; after: EmployeeDetail } | { ok: false; error: EmployeeWriteError }>;
}

export type ConflictPolicy = 'keepTarget' | 'keepSource';

export interface MergeOutcome {
  readonly sourceName: string;
  readonly moved: number;
  readonly conflicts: number;
  readonly aliasesMoved: number;
}

export interface ErasureOutcome {
  readonly uploadKeys: readonly string[];
  readonly redacted: number;
}

/**
 * Data-changing operations that span several tables (ADR-017/018). Each runs
 * in one transaction and bumps scoreRevision, so earlier imports can no
 * longer be rolled back.
 */
export interface EmployeeDataRepository {
  merge(targetId: string, sourceId: string, policy: ConflictPolicy): Promise<Result<MergeOutcome, 'NOT_FOUND'>>;
  /** Current cell, or null if none is stored. */
  correctScore(employeeId: string, sprint: SprintCode, cell: ScoreCell): Promise<Result<{ before: ScoreCell | null }, 'NOT_FOUND' | 'UNKNOWN_SPRINT'>>;
  /** How many stored upload originals an erasure would delete. */
  storedUploadCount(): Promise<number>;
  /** Delete the person and redact every reference; returns the upload keys to remove from disk. */
  erase(employeeId: string): Promise<Result<ErasureOutcome, 'NOT_FOUND'>>;
}

export type LabelKind = 'team' | 'designation';

export interface LabelRecord {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly headcount: number;
  readonly aliases: readonly string[];
}

export interface LabelRepository {
  list(kind: LabelKind): Promise<LabelRecord[]>;
  update(kind: LabelKind, id: string, patch: { name?: string; sortOrder?: number }): Promise<{ ok: true; before: LabelRecord; after: LabelRecord } | { ok: false; error: 'NOT_FOUND' | 'NAME_TAKEN' }>;
}

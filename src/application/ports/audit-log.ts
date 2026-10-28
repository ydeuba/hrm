/** Auditable actions (architecture: AuditEvent). */
export type AuditAction =
  | 'AUTH_LOGIN_OK'
  | 'AUTH_LOGIN_FAIL'
  | 'AUTH_LOCKOUT'
  | 'AUTH_LOGOUT'
  | 'AUTH_PASSWORD_CHANGE'
  | 'IMPORT_PREVIEW'
  | 'IMPORT_COMMIT'
  | 'IMPORT_ROLLBACK'
  | 'IMPORT_DISCARD'
  | 'EMPLOYEE_UPDATE'
  | 'LABEL_UPDATE'
  | 'EMPLOYEE_MERGE'
  | 'EMPLOYEE_ERASE'
  | 'SCORE_CORRECT'
  | 'SETTINGS_UPDATE'
  | 'SPRINT_UPDATE'
  | 'BACKUP_CREATE';

export interface AuditEntry {
  readonly actorId: string | null;
  readonly action: AuditAction;
  readonly entity?: string;
  readonly entityId?: string;
  readonly before?: unknown;
  readonly after?: unknown;
  readonly meta?: unknown;
}

/** Append-only audit trail. Payloads must never contain passwords, tokens or score matrices. */
export interface AuditLog {
  record(entry: AuditEntry): Promise<void>;
}

export const AUDIT_ACTIONS: readonly AuditAction[] = [
  'AUTH_LOGIN_OK', 'AUTH_LOGIN_FAIL', 'AUTH_LOCKOUT', 'AUTH_LOGOUT', 'AUTH_PASSWORD_CHANGE',
  'IMPORT_PREVIEW', 'IMPORT_COMMIT', 'IMPORT_ROLLBACK', 'IMPORT_DISCARD',
  'EMPLOYEE_UPDATE', 'LABEL_UPDATE', 'EMPLOYEE_MERGE', 'EMPLOYEE_ERASE', 'SCORE_CORRECT',
  'SETTINGS_UPDATE', 'SPRINT_UPDATE', 'BACKUP_CREATE',
];

export interface AuditQuery {
  /** Inclusive lower bound. */
  readonly from?: Date;
  /** Exclusive upper bound. */
  readonly to?: Date;
  readonly action?: AuditAction;
  readonly cursor?: string;
  readonly limit: number;
}

export interface AuditRecord {
  readonly id: string;
  readonly at: Date;
  readonly actorEmail: string | null;
  readonly action: string;
  readonly entity: string | null;
  readonly entityId: string | null;
  readonly before: unknown;
  readonly after: unknown;
  readonly meta: unknown;
}

/** Read side of the audit trail (US-09-02): newest first, keyset cursor. */
export interface AuditReader {
  list(query: AuditQuery): Promise<{ items: AuditRecord[]; nextCursor: string | null }>;
}

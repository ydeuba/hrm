import { z } from 'zod';
import { AUDIT_ACTIONS, type AuditAction, type AuditQuery } from '@/application/ports/audit-log';

/** Kathmandu is a fixed UTC+05:45 (no DST), so calendar days map to fixed instants. */
const KTM_OFFSET = '+05:45';
const DAY_MS = 86_400_000;
export const AUDIT_PAGE_SIZE = 50;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine((d) => !Number.isNaN(Date.parse(d)), 'Invalid date');

export const AuditQuerySchema = z.object({
  from: day.optional(),
  to: day.optional(),
  action: z.enum(AUDIT_ACTIONS as [AuditAction, ...AuditAction[]]).optional(),
  cursor: z.string().max(64).optional(),
});

export type AuditFilter = z.infer<typeof AuditQuerySchema>;

/** Calendar days in Asia/Kathmandu → [from 00:00, day after "to" 00:00) in UTC (US-09-02 AC-3). */
export function toAuditQuery(f: AuditFilter, limit = AUDIT_PAGE_SIZE): AuditQuery {
  const start = (d: string) => new Date(`${d}T00:00:00${KTM_OFFSET}`);
  return {
    from: f.from ? start(f.from) : undefined,
    to: f.to ? new Date(start(f.to).getTime() + DAY_MS) : undefined,
    action: f.action,
    cursor: f.cursor,
    limit,
  };
}

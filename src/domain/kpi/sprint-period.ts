import { err, ok, type Result } from '../shared/result';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Sprint dates are calendar days stored at UTC midnight, so UTC parts are the calendar date. */
const dayMonth = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]}`;
const full = (d: Date) => `${dayMonth(d)} ${d.getUTCFullYear()}`;

/** "S138 · 06 Oct – 17 Oct 2026" (US-03-07 AC-2); open-ended and cross-year ranges are spelled out. */
export function sprintPeriodLabel(code: string, start: Date | null, end: Date | null): string {
  if (start && end) {
    const from = start.getUTCFullYear() === end.getUTCFullYear() ? dayMonth(start) : full(start);
    return `${code} · ${from} – ${full(end)}`;
  }
  if (start) return `${code} · from ${full(start)}`;
  if (end) return `${code} · until ${full(end)}`;
  return code;
}

/** End must not precede start (US-03-07 AC-1). */
export function validateSprintDates(start: Date | null, end: Date | null): Result<void, 'END_BEFORE_START'> {
  return start && end && end.getTime() < start.getTime() ? err('END_BEFORE_START') : ok(undefined);
}

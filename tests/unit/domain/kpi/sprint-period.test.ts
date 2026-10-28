import { describe, expect, it } from 'vitest';
import { sprintPeriodLabel, validateSprintDates } from '@/domain/kpi/sprint-period';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe('sprintPeriodLabel (US-03-07 AC-2)', () => {
  it('formats a same-year range', () => {
    expect(sprintPeriodLabel('S138', d('2026-10-06'), d('2026-10-17'))).toBe('S138 · 06 Oct – 17 Oct 2026');
  });
  it('spells out both years when the range crosses a year', () => {
    expect(sprintPeriodLabel('S141', d('2026-12-28'), d('2027-01-08'))).toBe('S141 · 28 Dec 2026 – 08 Jan 2027');
  });
  it('handles open-ended and undated sprints', () => {
    expect(sprintPeriodLabel('S1', d('2026-01-05'), null)).toBe('S1 · from 05 Jan 2026');
    expect(sprintPeriodLabel('S1', null, d('2026-01-16'))).toBe('S1 · until 16 Jan 2026');
    expect(sprintPeriodLabel('S1', null, null)).toBe('S1');
  });
});

describe('validateSprintDates (US-03-07 AC-1)', () => {
  it('requires end ≥ start; single-day and partial ranges are fine', () => {
    expect(validateSprintDates(d('2026-10-17'), d('2026-10-06'))).toEqual({ ok: false, error: 'END_BEFORE_START' });
    expect(validateSprintDates(d('2026-10-06'), d('2026-10-06')).ok).toBe(true);
    expect(validateSprintDates(null, d('2026-10-06')).ok).toBe(true);
    expect(validateSprintDates(null, null).ok).toBe(true);
  });
});

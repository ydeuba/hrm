import { describe, expect, it } from 'vitest';
import { describeCell, parseCorrection } from '@/domain/kpi/score-correction';
import { NOT_SCORED, RUN } from '@/domain/kpi/score-cell';

describe('parseCorrection (US-03-05)', () => {
  it('accepts 0–10 (half-up to centi), RUN and N/A with a trimmed reason', () => {
    expect(parseCorrection(8.255, '  typo in sheet ')).toEqual({ ok: true, value: { cell: { kind: 'scored', centi: 826 }, reason: 'typo in sheet' } });
    expect(parseCorrection(0, 'abc')).toMatchObject({ ok: true, value: { cell: { kind: 'scored', centi: 0 } } });
    expect(parseCorrection(10, 'abc')).toMatchObject({ ok: true, value: { cell: { kind: 'scored', centi: 1000 } } });
    expect(parseCorrection('RUN', 'was on run duty')).toMatchObject({ ok: true, value: { cell: RUN } });
    expect(parseCorrection('N/A', 'not assessed')).toMatchObject({ ok: true, value: { cell: NOT_SCORED } });
  });

  it('rejects out-of-range values', () => {
    for (const v of [-0.01, 10.01, Number.NaN, Number.POSITIVE_INFINITY]) expect(parseCorrection(v, 'reason')).toEqual({ ok: false, error: 'OUT_OF_RANGE' });
  });

  it('requires a 3–500 character reason', () => {
    expect(parseCorrection(5, '  ab ')).toEqual({ ok: false, error: 'REASON_LENGTH' });
    expect(parseCorrection(5, 'x'.repeat(501))).toEqual({ ok: false, error: 'REASON_LENGTH' });
    expect(parseCorrection(5, 'x'.repeat(500)).ok).toBe(true);
  });
});

describe('describeCell', () => {
  it('renders cells for audit payloads', () => {
    expect(describeCell({ kind: 'scored', centi: 825 })).toBe(8.25);
    expect(describeCell(RUN)).toBe('RUN');
    expect(describeCell(NOT_SCORED)).toBe('N/A');
    expect(describeCell(null)).toBeNull();
  });
});

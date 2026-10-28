import { describe, expect, it } from 'vitest';
import { ERASED, erasureNeedles, jsonMentions, mentions, redactJson } from '@/domain/shared/redact';

const needles = erasureNeedles(['Bishal  Joshi', 'bishal joshi', 'cl0emp123', '  ']);

describe('erasure redaction (ADR-017)', () => {
  it('normalises, de-duplicates and drops blank needles', () => {
    expect(needles).toEqual(['bishal joshi', 'cl0emp123']);
  });

  it('matches regardless of case and spacing', () => {
    expect(mentions('Row 44: BISHAL   joshi S122 rounded', needles)).toBe(true);
    expect(mentions('Bishal Stha', needles)).toBe(false);
  });

  it('redacts matching strings and keys anywhere in nested JSON, keeping other values', () => {
    const input = { rows: [{ name: 'Bishal Joshi', score: 598, ok: true }, { name: 'Anuj Magar', score: 700 }], byName: { 'bishal joshi': 1 }, id: 'cl0emp123', n: null };
    expect(redactJson(input, needles)).toEqual({
      rows: [{ name: ERASED, score: 598, ok: true }, { name: 'Anuj Magar', score: 700 }], byName: { [ERASED]: 1 }, id: ERASED, n: null,
    });
  });

  it('pre-checks stored JSON cheaply', () => {
    expect(jsonMentions({ a: ['x', 'Bishal Joshi'] }, needles)).toBe(true);
    expect(jsonMentions({ a: 1 }, needles)).toBe(false);
    expect(jsonMentions(null, needles)).toBe(false);
    expect(jsonMentions(undefined, needles)).toBe(false);
  });
});

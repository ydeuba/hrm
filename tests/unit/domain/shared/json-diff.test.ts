import { describe, expect, it } from 'vitest';
import { diffJson, flatten } from '@/domain/shared/json-diff';

describe('flatten', () => {
  it('produces dotted leaf paths for objects and arrays', () => {
    expect(Object.fromEntries(flatten({ a: 1, b: { c: [true, { d: null }] }, e: [], f: {} }))).toEqual({ a: 1, 'b.c.0': true, 'b.c.1.d': null, e: [], f: {} });
  });

  it('keeps a scalar root under the empty path and ignores undefined', () => {
    expect(Object.fromEntries(flatten('x'))).toEqual({ '': 'x' });
    expect(flatten(undefined).size).toBe(0);
    expect(flatten({}).size).toBe(0);
  });
});

describe('diffJson', () => {
  it('lists changed, added and removed leaves in natural path order', () => {
    const before = { name: 'AI Team', bands: [{ min: 8 }, { min: 6 }], gone: 1 };
    const after = { name: 'AI Squad', bands: [{ min: 9 }, { min: 6 }], added: 'x' };
    expect(diffJson(before, after)).toEqual([
      { path: 'added', before: undefined, after: 'x' },
      { path: 'bands.0.min', before: 8, after: 9 },
      { path: 'gone', before: 1, after: undefined },
      { path: 'name', before: 'AI Team', after: 'AI Squad' },
    ]);
  });

  it('handles null and missing sides', () => {
    expect(diffJson(null, { a: 1 })).toEqual([{ path: '', before: null, after: undefined }, { path: 'a', before: undefined, after: 1 }]);
    expect(diffJson(undefined, undefined)).toEqual([]);
    expect(diffJson({ a: 1 }, { a: 1 })).toEqual([]);
  });
});

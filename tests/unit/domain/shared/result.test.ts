import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, mapResult, ok } from '@/domain/shared/result';
import { DomainError, ValidationError } from '@/domain/shared/errors';

describe('Result', () => {
  it('wraps success values', () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    expect(r.value).toBe(42);
  });

  it('wraps errors', () => {
    const r = err('BOOM');
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
    expect(r.error).toBe('BOOM');
  });

  it('maps only success values', () => {
    expect(mapResult(ok(2), (v) => v * 3)).toEqual(ok(6));
    const failure = err('NOPE');
    expect(mapResult(failure, (v: number) => v * 3)).toBe(failure);
  });
});

describe('DomainError', () => {
  it('carries a stable code and details', () => {
    const e = new DomainError('SOME_CODE', 'message', { a: 1 });
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('SOME_CODE');
    expect(e.details).toEqual({ a: 1 });
    expect(e.name).toBe('DomainError');
  });

  it('ValidationError uses VALIDATION_FAILED', () => {
    const e = new ValidationError('bad input');
    expect(e).toBeInstanceOf(DomainError);
    expect(e.code).toBe('VALIDATION_FAILED');
    expect(e.name).toBe('ValidationError');
  });
});

import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from '@/app/_lib/origin-check';

const req = (method: string, origin?: string) =>
  new Request('http://localhost:3000/api/v1/x', { method, headers: origin ? { origin } : {} });

describe('isAllowedOrigin', () => {
  it('allows safe methods regardless of Origin', () => {
    expect(isAllowedOrigin(req('GET'), [])).toBe(true);
    expect(isAllowedOrigin(req('head', 'https://evil.test'), [])).toBe(true);
    expect(isAllowedOrigin(req('OPTIONS'), [])).toBe(true);
  });

  it('allows same-origin state-changing requests', () => {
    expect(isAllowedOrigin(req('POST', 'http://localhost:3000'), [])).toBe(true);
  });

  it('rejects state-changing requests without an Origin', () => {
    expect(isAllowedOrigin(req('POST'), [])).toBe(false);
  });

  it('rejects foreign origins', () => {
    expect(isAllowedOrigin(req('DELETE', 'https://evil.test'), [])).toBe(false);
  });

  it('allows configured trusted origins', () => {
    expect(isAllowedOrigin(req('PUT', 'https://hrm.example.com'), ['https://hrm.example.com'])).toBe(true);
  });
});

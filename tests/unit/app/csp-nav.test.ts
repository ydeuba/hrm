import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { buildCsp, createNonce } from '@/app/_lib/csp';
import { proxy } from '@/proxy';
import { isActivePath, NAV_ITEMS } from '@/components/shell/nav-items';

describe('buildCsp', () => {
  it('uses the nonce and strict-dynamic without unsafe-eval in production', () => {
    const csp = buildCsp('abc123', false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it('allows eval and websockets only in development', () => {
    const csp = buildCsp('n', true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws:");
  });
});

describe('createNonce', () => {
  it('produces distinct base64 values of 128 bits', () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(atob(a)).toHaveLength(16);
  });
});

describe('proxy', () => {
  const withCookie = (url: string) => new NextRequest(url, { headers: { cookie: 'hrm_session=abc' } });

  it('redirects cookie-less page requests to /login with a next parameter (gate 1)', () => {
    const res = proxy(new NextRequest('http://localhost:3000/employees?x=1'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?next=%2Femployees%3Fx%3D1');
  });

  it('redirects the root without a next parameter', () => {
    const res = proxy(new NextRequest('http://localhost:3000/'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('answers cookie-less API requests with 401 JSON', async () => {
    const res = proxy(new NextRequest('http://localhost:3000/api/v1/auth/me'));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHENTICATED');
  });

  it('lets public paths through without a cookie', () => {
    for (const p of ['/login', '/api/health', '/api/v1/auth/login']) {
      const res = proxy(new NextRequest(`http://localhost:3000${p}`));
      expect(res.headers.get('location')).toBeNull();
      expect(res.status).toBe(200);
    }
  });

  it('sends HSTS only over HTTPS', () => {
    expect(proxy(withCookie('http://localhost:3000/dashboard')).headers.get('strict-transport-security')).toBeNull();
    expect(proxy(withCookie('https://hrm.example.com/dashboard')).headers.get('strict-transport-security')).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });

  it('forwards the requested path for post-login redirects', () => {
    const res = proxy(withCookie('http://localhost:3000/rankings?tab=lastN'));
    expect(res.headers.get('x-middleware-request-x-pathname')).toBe('/rankings?tab=lastN');
  });

  it('sets a nonce CSP on the response and forwards the nonce on the request', () => {
    const res = proxy(withCookie('http://localhost:3000/dashboard'));
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(res.headers.get('x-middleware-request-x-nonce')).toBeTruthy();
    expect(csp).toContain(`'nonce-${res.headers.get('x-middleware-request-x-nonce')}'`);
  });
});

describe('navigation', () => {
  it('lists the six primary sections', () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(['Dashboard', 'Rankings', 'Imports', 'Employees', 'Settings', 'Audit']);
  });

  it('matches the active section including nested paths', () => {
    expect(isActivePath('/employees', '/employees')).toBe(true);
    expect(isActivePath('/employees/abc', '/employees')).toBe(true);
    expect(isActivePath('/employeesx', '/employees')).toBe(false);
    expect(isActivePath('/dashboard', '/employees')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  clearedSessionCookie,
  isPublicPath,
  isSecureRequest,
  safeRedirectPath,
  sessionCookie,
} from '@/app/_lib/session-cookie';

describe('session cookie', () => {
  it('is httpOnly, SameSite=Lax, path / with Max-Age = absolute lifetime', () => {
    expect(sessionCookie('tok', 43_200, true)).toEqual({
      name: 'hrm_session',
      value: 'tok',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 43_200,
    });
  });

  it('clears with Max-Age 0', () => {
    expect(clearedSessionCookie(false)).toMatchObject({ value: '', maxAge: 0, secure: false });
  });

  it('detects HTTPS directly or behind a proxy', () => {
    expect(isSecureRequest(new Request('https://hrm.example.com/'))).toBe(true);
    expect(isSecureRequest(new Request('http://localhost:3000/'))).toBe(false);
    expect(isSecureRequest(new Request('http://10.0.0.5/', { headers: { 'x-forwarded-proto': 'https, http' } }))).toBe(true);
    expect(isSecureRequest(new Request('https://x/', { headers: { 'x-forwarded-proto': 'http' } }))).toBe(false);
  });
});

describe('safeRedirectPath (open-redirect guard)', () => {
  it('accepts same-site relative paths', () => {
    expect(safeRedirectPath('/employees/abc?tab=scores')).toBe('/employees/abc?tab=scores');
  });

  it('falls back for absolute, protocol-relative, backslash or login targets', () => {
    for (const bad of [null, undefined, '', 'https://evil.test', '//evil.test', '/\\evil.test', 'dashboard', '/login', '/login?next=/x']) {
      expect(safeRedirectPath(bad)).toBe('/dashboard');
    }
    expect(safeRedirectPath('//evil', '')).toBe('');
  });
});

describe('public paths', () => {
  it('only exposes login and health', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/api/health')).toBe(true);
    expect(isPublicPath('/api/v1/auth/login')).toBe(true);
    expect(isPublicPath('/api/v1/auth/logout')).toBe(false);
    expect(isPublicPath('/dashboard')).toBe(false);
  });
});

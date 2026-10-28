export const SESSION_COOKIE = 'hrm_session';

/** Public routes that never require a session (ADR-006 exceptions). */
export const PUBLIC_PATHS: readonly string[] = ['/login', '/api/health', '/api/v1/auth/login'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

/** HTTPS detection that also works behind a TLS-terminating reverse proxy. */
export function isSecureRequest(req: Request): boolean {
  const forwarded = req.headers.get('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0]?.trim() === 'https';
  return new URL(req.url).protocol === 'https:';
}

export interface CookieSpec {
  readonly name: string;
  readonly value: string;
  readonly httpOnly: true;
  readonly sameSite: 'lax';
  readonly secure: boolean;
  readonly path: '/';
  readonly maxAge: number;
}

/** Session cookie: Max-Age = absolute lifetime; idle expiry is server-side only (ADR-005). */
export function sessionCookie(token: string, maxAgeSec: number, secure: boolean): CookieSpec {
  return { name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: maxAgeSec };
}

export function clearedSessionCookie(secure: boolean): CookieSpec {
  return sessionCookie('', 0, secure);
}

/**
 * Only allow same-site relative redirect targets after login (open-redirect guard).
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (raw === '/login' || raw.startsWith('/login?')) return fallback;
  return raw;
}

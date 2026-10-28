import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, createNonce } from '@/app/_lib/csp';
import { isPublicPath, isSecureRequest, SESSION_COOKIE } from '@/app/_lib/session-cookie';

/** HSTS is only meaningful (and only sent) over HTTPS; local http:// use is unaffected. */
const HSTS = 'max-age=31536000; includeSubDomains';

/**
 * Request gate (Next.js 16 `proxy`), ADR-006 gate 1:
 *  - optimistic auth: no session cookie → /login redirect (pages) or 401 (API);
 *    the cookie is fully validated by requireSession()/withHandler (gate 2);
 *  - per-request CSP nonce, forwarded so Next.js stamps its inline scripts;
 *  - x-pathname, so the DAL can send users back after signing in.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (!isPublicPath(pathname) && !request.cookies.get(SESSION_COOKIE)?.value) {
    return unauthenticated(request, pathname, search);
  }

  const nonce = createNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-pathname', `${pathname}${search}`);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  if (isSecureRequest(request)) response.headers.set('Strict-Transport-Security', HSTS);
  return response;
}

function unauthenticated(request: NextRequest, pathname: string, search: string): NextResponse {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(`${pathname}${search}`)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|icon.svg).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};

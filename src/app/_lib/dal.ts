import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { SessionUser } from '@/application/use-cases/auth/validate-session';
import { getContainer } from '@/infrastructure/container';
import { HttpError } from './http-errors';
import { safeRedirectPath, SESSION_COOKIE } from './session-cookie';

export type { SessionUser };

async function resolve(token: string | undefined): Promise<SessionUser | null> {
  const { useCases } = await getContainer();
  const result = await useCases.validateSession.execute(token);
  return result.ok ? result.value : null;
}

/** Current session for Server Components, validated against the DB once per request. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return resolve(token);
});

/**
 * Gate 2 (ADR-006) for pages and layouts: redirect to /login when the session is
 * missing, expired or idle. Never writes cookies (Server Components cannot).
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (session) return session;
  const path = (await headers()).get('x-pathname');
  const next = safeRedirectPath(path, '');
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
}

/** Gate 2 for Route Handlers: throws 401 UNAUTHENTICATED. */
export async function requireApiSession(req: Request & { cookies: { get(name: string): { value: string } | undefined } }): Promise<SessionUser> {
  const session = await resolve(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in required');
  return session;
}

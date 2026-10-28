import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { isSecureRequest, sessionCookie } from '@/app/_lib/session-cookie';
import { withPublicHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

const LoginBody = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(1024),
});

/** POST /api/v1/auth/login — sign in and set the session cookie (US-01-01). */
export const POST = withPublicHandler({ body: LoginBody }, async ({ req, body, container }) => {
  const result = await container.useCases.login.execute({
    email: body.email,
    password: body.password,
    userAgent: req.headers.get('user-agent'),
  });
  if (!result.ok) {
    if (result.error.code === 'LOCKED_OUT') {
      const retryAfterSec = result.error.retryAfterSec;
      throw new HttpError(
        429,
        'LOCKED_OUT',
        `Too many failed attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
        { retryAfterSec },
        { 'Retry-After': String(retryAfterSec) },
      );
    }
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  const { token, user } = result.value;
  const res = NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(sessionCookie(token, container.env.SESSION_ABSOLUTE_HOURS * 3600, isSecureRequest(req)));
  return res;
});

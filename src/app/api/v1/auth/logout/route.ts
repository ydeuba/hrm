import { NextResponse } from 'next/server';
import { clearedSessionCookie, isSecureRequest } from '@/app/_lib/session-cookie';
import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

/** POST /api/v1/auth/logout — revoke the session server-side and clear the cookie (US-01-02 AC-2). */
export const POST = withHandler({}, async ({ req, session, container }) => {
  await container.useCases.logout.execute({ tokenHash: session.tokenHash, userId: session.userId });
  const res = new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(clearedSessionCookie(isSecureRequest(req)));
  return res;
});

import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

/** GET /api/v1/auth/me — current admin and session expiry. */
export const GET = withHandler({}, async ({ session }) =>
  Response.json(
    {
      id: session.userId,
      email: session.email,
      idleExpiresAt: session.idleExpiresAt.toISOString(),
      absoluteExpiresAt: session.absoluteExpiresAt.toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  ),
);

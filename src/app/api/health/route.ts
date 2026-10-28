import { withPublicHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

/** Liveness + database check. Unauthenticated by design (NFR-08 exception); exposes no version info. */
export const GET = withPublicHandler({}, async ({ container }) => {
  try {
    await container.db.$queryRawUnsafe('SELECT 1');
    return Response.json({ status: 'ok', db: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    container.logger.error({ err: error }, 'Health check: database unavailable');
    return Response.json({ status: 'ok', db: 'down' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
});

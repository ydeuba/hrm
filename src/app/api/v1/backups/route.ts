import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

/** POST /api/v1/backups — download a zip of the DB snapshot and uploads (US-09-03). POST so the origin check applies. */
export const POST = withHandler({}, async ({ session, container }) => {
  const { fileName, bytes } = await container.useCases.createBackup.execute(session.userId);
  return new Response(bytes as BodyInit, {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${fileName}"`, 'Cache-Control': 'no-store' },
  });
});

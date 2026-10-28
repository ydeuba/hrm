import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

const CONTENT_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
};

/** GET /api/v1/imports/{id}/file — download the original uploaded file (US-02-09). */
export const GET = withHandler<undefined, undefined, { id: string }>({}, async ({ params, container }) => {
  const result = await container.useCases.getImportFile.execute(params.id);
  if (!result.ok) {
    throw result.error === 'NOT_FOUND'
      ? new HttpError(404, 'NOT_FOUND', 'Import not found')
      : new HttpError(410, 'ORIGINAL_REMOVED', 'The original file was removed by retention or erasure');
  }
  const { bytes, fileName, kind } = result.value;
  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': CONTENT_TYPES[kind] ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

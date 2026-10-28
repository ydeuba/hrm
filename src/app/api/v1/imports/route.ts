import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { readUploadedFile } from '@/app/_lib/read-upload';
import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/imports — upload the KPI master sheet and create a preview
 * (US-02-01, US-02-03). Nothing outside the preview batch is written.
 */
export const POST = withHandler({}, async ({ req, container, session }) => {
  const { fileName, bytes } = await readUploadedFile(req, container.env.UPLOAD_MAX_BYTES);
  const result = await container.useCases.previewImport.execute({ fileName, bytes, actorId: session.userId });
  if (!result.ok) {
    const status = result.error.code === 'IMPORT_TOO_LARGE' ? 413 : 400;
    throw new HttpError(status, result.error.code, result.error.reason);
  }
  const preview = await container.useCases.getImport.execute(result.value.batchId);
  if (!preview.ok) throw new HttpError(500, 'INTERNAL', 'Preview could not be read back');
  return Response.json(preview.value, { status: 201, headers: { Location: `/api/v1/imports/${result.value.batchId}` } });
});

const ListQuery = z.object({
  cursor: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** GET /api/v1/imports — import history, newest first. */
export const GET = withHandler({ query: ListQuery }, async ({ query, container }) =>
  Response.json(await container.useCases.listImports.execute(query), { headers: { 'Cache-Control': 'no-store' } }),
);

import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import type { CommitError } from '@/application/use-cases/imports/commit-import';

export const dynamic = 'force-dynamic';

const CommitBody = z.object({
  merges: z
    .array(z.object({ fileName: z.string().min(1).max(200), existingEmployeeId: z.string().min(1).max(64) }))
    .max(500)
    .default([]),
});

const ERRORS: Record<CommitError, [number, string]> = {
  NOT_FOUND: [404, 'Import not found'],
  NOT_A_PREVIEW: [409, 'This import is no longer an open preview'],
  PREVIEW_EXPIRED: [410, 'This preview expired — upload the file again'],
  IMPORT_HAS_ERRORS: [422, 'Fix the errors in the sheet and upload it again'],
  INVALID_MERGE: [400, 'A confirmed merge was not offered in this preview'],
  CONFLICT_STALE_PREVIEW: [409, 'Data changed since this preview was created — upload the file again'],
};

/** POST /api/v1/imports/{id}/commit — apply the preview atomically (US-02-07). */
export const POST = withHandler<z.infer<typeof CommitBody>, undefined, { id: string }>({ body: CommitBody }, async ({ params, body, container, session }) => {
  const result = await container.useCases.commitImport.execute({ batchId: params.id, actorId: session.userId, merges: body.merges });
  if (!result.ok) {
    const [status, message] = ERRORS[result.error];
    throw new HttpError(status, result.error, message);
  }
  const detail = await container.useCases.getImport.execute(params.id);
  return Response.json(detail.ok ? detail.value : { id: params.id, commitRevision: result.value.commitRevision });
});

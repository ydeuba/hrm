import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import type { RollbackError } from '@/application/use-cases/imports/rollback-import';

export const dynamic = 'force-dynamic';

const ERRORS: Record<RollbackError, [number, string]> = {
  NOT_FOUND: [404, 'No committed import with this id'],
  NOT_LATEST: [409, 'Only the most recent import can be rolled back'],
  CONFLICT_LATER_CHANGES: [409, 'Data changed after this import (an edit, merge or newer change) — roll back is no longer possible'],
};

/** POST /api/v1/imports/{id}/rollback — revert the latest committed import (US-02-06). */
export const POST = withHandler<undefined, undefined, { id: string }>({}, async ({ params, session, container }) => {
  const result = await container.useCases.rollbackImport.execute({ batchId: params.id, actorId: session.userId });
  if (!result.ok) {
    const [status, message] = ERRORS[result.error];
    throw new HttpError(status, result.error, message);
  }
  const detail = await container.useCases.getImport.execute(params.id);
  return Response.json(detail.ok ? detail.value : { id: params.id, status: 'ROLLED_BACK' });
});

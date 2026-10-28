import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

const notFound = () => new HttpError(404, 'NOT_FOUND', 'Import not found');

/** GET /api/v1/imports/{id} — preview or committed batch detail. */
export const GET = withHandler<undefined, undefined, { id: string }>({}, async ({ params, container }) => {
  const result = await container.useCases.getImport.execute(params.id);
  if (!result.ok) throw notFound();
  return Response.json(result.value, { headers: { 'Cache-Control': 'no-store' } });
});

/** DELETE /api/v1/imports/{id} — discard a preview. */
export const DELETE = withHandler<undefined, undefined, { id: string }>({}, async ({ params, container, session }) => {
  const result = await container.useCases.discardImport.execute({ batchId: params.id, actorId: session.userId });
  if (!result.ok) {
    if (result.error === 'NOT_FOUND') throw notFound();
    throw new HttpError(409, 'NOT_A_PREVIEW', 'Only an open preview can be discarded');
  }
  return new Response(null, { status: 204 });
});

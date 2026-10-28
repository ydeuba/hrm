import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

const Body = z.object({ sourceId: z.string().min(1).max(64), conflictPolicy: z.enum(['keepTarget', 'keepSource']) }).strict();

/** POST /api/v1/employees/{id}/merge — merge `sourceId` into `{id}` (US-03-04). */
export const POST = withHandler<z.infer<typeof Body>, undefined, { id: string }>({ body: Body }, async ({ params, body, session, container }) => {
  const r = await container.useCases.mergeEmployees.execute({ targetId: params.id, sourceId: body.sourceId, policy: body.conflictPolicy, actorId: session.userId });
  if (r.ok) return Response.json(r.value);
  if (r.error === 'SAME_EMPLOYEE') throw new HttpError(400, 'SAME_EMPLOYEE', 'An employee cannot be merged into themselves');
  throw new HttpError(404, 'NOT_FOUND', 'Employee not found');
});

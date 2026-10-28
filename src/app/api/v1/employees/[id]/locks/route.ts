import { z } from 'zod';
import { withHandler } from '@/app/_lib/with-handler';
import { employeeError } from '../../_errors';

export const dynamic = 'force-dynamic';

const Body = z
  .object({ teamLocked: z.literal(false).optional(), designationLocked: z.literal(false).optional() })
  .strict()
  .refine((b) => b.teamLocked !== undefined || b.designationLocked !== undefined, 'Nothing to unlock');

/** PATCH /api/v1/employees/{id}/locks — let imports update the field again (US-03-02 AC-3). */
export const PATCH = withHandler<z.infer<typeof Body>, undefined, { id: string }>({ body: Body }, async ({ params, body, session, container }) => {
  const result = await container.useCases.updateEmployee.execute({ id: params.id, patch: body, actorId: session.userId });
  if (!result.ok) throw employeeError(result.error);
  return Response.json(result.value);
});

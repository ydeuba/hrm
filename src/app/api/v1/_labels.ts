import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import type { LabelKind } from '@/application/ports/employee-write';

const Patch = z
  .object({ name: z.string().trim().min(1).max(80).optional(), sortOrder: z.number().int().min(0).max(999).optional() })
  .strict()
  .refine((p) => p.name !== undefined || p.sortOrder !== undefined, 'Nothing to update');

/** GET handler listing teams or designations with headcount (US-03-03). */
export const listLabels = (kind: LabelKind) =>
  withHandler({}, async ({ container }) => Response.json(await container.useCases.manageLabels.list(kind), { headers: { 'Cache-Control': 'no-store' } }));

/** PATCH handler renaming/reordering a team or designation (US-03-03). */
export const updateLabel = (kind: LabelKind) =>
  withHandler<z.infer<typeof Patch>, undefined, { id: string }>({ body: Patch }, async ({ params, body, session, container }) => {
    const result = await container.useCases.manageLabels.update({ kind, id: params.id, patch: body, actorId: session.userId });
    if (!result.ok) {
      throw result.error === 'NOT_FOUND'
        ? new HttpError(404, 'NOT_FOUND', `${kind === 'team' ? 'Team' : 'Designation'} not found`)
        : new HttpError(409, 'NAME_TAKEN', 'That name is already used by another one');
    }
    return Response.json(result.value);
  });

import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import type { SprintCode } from '@/domain/kpi/sprint-code';

export const dynamic = 'force-dynamic';

const date = z.union([z.iso.date(), z.null()]).transform((s) => (s ? new Date(`${s}T00:00:00.000Z`) : null));
const Body = z.object({ startDate: date, endDate: date }).strict();

/** PATCH /api/v1/sprints/{code} — set or clear a sprint's dates (US-03-07 AC-1). */
export const PATCH = withHandler<z.infer<typeof Body>, undefined, { code: string }>({ body: Body }, async ({ params, body, session, container }) => {
  const code = params.code.toUpperCase();
  if (!/^S\d{1,6}$/.test(code)) throw new HttpError(404, 'NOT_FOUND', 'Unknown sprint');
  const r = await container.useCases.manageSprints.setDates({ code: code as SprintCode, ...body, actorId: session.userId });
  if (r.ok) return Response.json(r.value);
  if (r.error === 'END_BEFORE_START') throw new HttpError(400, 'VALIDATION_FAILED', 'End date must be on or after the start date', [{ path: 'endDate', message: 'End date must be on or after the start date' }]);
  throw new HttpError(404, 'NOT_FOUND', 'Unknown sprint');
});

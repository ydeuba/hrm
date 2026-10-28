import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import type { CorrectionError } from '@/application/use-cases/employees/employee-data-use-cases';
import { REASON_MAX, REASON_MIN } from '@/domain/kpi/score-correction';
import type { SprintCode } from '@/domain/kpi/sprint-code';

export const dynamic = 'force-dynamic';

const Body = z.object({ value: z.union([z.number(), z.literal('RUN'), z.literal('N/A')]), reason: z.string().max(2000) }).strict();
const SPRINT = /^S\d{1,6}$/;

const ERRORS: Record<CorrectionError, [number, string]> = {
  OUT_OF_RANGE: [422, 'Scores must be between 0 and 10'],
  REASON_LENGTH: [400, `Give a reason of ${REASON_MIN}–${REASON_MAX} characters`],
  NOT_FOUND: [404, 'Employee not found'],
  UNKNOWN_SPRINT: [404, 'Unknown sprint'],
};

/** PUT /api/v1/employees/{id}/scores/{sprint} — correct one cell with a reason (US-03-05). */
export const PUT = withHandler<z.infer<typeof Body>, undefined, { id: string; sprint: string }>({ body: Body }, async ({ params, body, session, container }) => {
  const sprint = params.sprint.toUpperCase();
  if (!SPRINT.test(sprint)) throw new HttpError(404, 'UNKNOWN_SPRINT', 'Unknown sprint');
  const r = await container.useCases.correctScore.execute({ employeeId: params.id, sprint: sprint as SprintCode, value: body.value, reason: body.reason, actorId: session.userId });
  if (r.ok) return new Response(null, { status: 204 });
  const [status, message] = ERRORS[r.error];
  throw new HttpError(status, r.error, message);
});

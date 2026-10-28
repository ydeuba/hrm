import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import { employeeError } from '../_errors';

export const dynamic = 'force-dynamic';

const optionalText = (max: number) => z.string().trim().max(max).transform((s) => (s === '' ? null : s)).nullable().optional();

const Patch = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
    teamId: z.string().min(1).max(64).optional(),
    designationId: z.string().min(1).max(64).optional(),
    employeeCode: optionalText(40),
    email: z.union([z.literal(''), z.email().max(254)]).transform((s) => (s === '' ? null : s)).nullable().optional(),
    joiningDate: z.union([z.literal(''), z.iso.date()]).transform((s) => (s ? new Date(`${s}T00:00:00.000Z`) : null)).nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .strict()
  .refine((p) => Object.keys(p).length > 0, 'Nothing to update');

/** GET /api/v1/employees/{id} */
export const GET = withHandler<undefined, undefined, { id: string }>({}, async ({ params, container }) => {
  const employee = await container.useCases.getEmployee.execute(params.id);
  if (!employee) throw new HttpError(404, 'NOT_FOUND', 'Employee not found');
  return Response.json(employee, { headers: { 'Cache-Control': 'no-store' } });
});

/** PATCH /api/v1/employees/{id} — edit; team/designation edits lock the field against imports (US-03-02). */
export const PATCH = withHandler<z.infer<typeof Patch>, undefined, { id: string }>({ body: Patch }, async ({ params, body, session, container }) => {
  const result = await container.useCases.updateEmployee.execute({ id: params.id, patch: body, actorId: session.userId });
  if (!result.ok) throw employeeError(result.error);
  return Response.json(result.value);
});

const Erase = z.object({ confirmName: z.string().max(200) }).strict();

/** DELETE /api/v1/employees/{id} — permanent privacy erasure (US-03-06, ADR-017). */
export const DELETE = withHandler<z.infer<typeof Erase>, undefined, { id: string }>({ body: Erase }, async ({ params, body, session, container }) => {
  const result = await container.useCases.eraseEmployee.execute({ id: params.id, confirmName: body.confirmName, actorId: session.userId });
  if (result.ok) return new Response(null, { status: 204 });
  if (result.error === 'CONFIRMATION_MISMATCH') throw new HttpError(422, 'CONFIRMATION_MISMATCH', "The name you typed doesn't match");
  throw new HttpError(404, 'NOT_FOUND', 'Employee not found');
});

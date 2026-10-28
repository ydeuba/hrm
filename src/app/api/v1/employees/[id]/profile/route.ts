import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import { RangeQuery } from '../../../kpi/_query';

export const dynamic = 'force-dynamic';

/** GET /api/v1/employees/{id}/profile — engineer drill-down (US-06-01/02). */
export const GET = withHandler<undefined, { from?: `S${number}`; to?: `S${number}` }, { id: string }>({ query: RangeQuery }, async ({ params, query, container }) => {
  const result = await container.useCases.getEngineerProfile.execute({ id: params.id, ...query });
  if (!result.ok) {
    throw result.error === 'NOT_FOUND' ? new HttpError(404, 'NOT_FOUND', 'Employee not found') : new HttpError(400, 'VALIDATION_FAILED', 'Unknown sprint range');
  }
  return Response.json(result.value, { headers: { 'Cache-Control': 'no-store' } });
});

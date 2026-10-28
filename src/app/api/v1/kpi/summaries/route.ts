import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import { RangeQuery } from '../_query';

export const dynamic = 'force-dynamic';

/** GET /api/v1/kpi/summaries — team/designation summaries, trend, Top-N, interpretation (US-06-03). */
export const GET = withHandler({ query: RangeQuery }, async ({ query, container }) => {
  const result = await container.useCases.getGroupSummaries.execute(query);
  if (!result.ok) throw new HttpError(400, 'VALIDATION_FAILED', 'Unknown sprint or "from" is after "to"');
  return Response.json(result.value, { headers: { 'Cache-Control': 'no-store' } });
});

import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import { RangeQuery } from '../_query';

export const dynamic = 'force-dynamic';

const Query = RangeQuery.extend({ scope: z.enum(['overall', 'designation', 'lastN']).default('overall') });

/** GET /api/v1/kpi/rankings — overall, per-designation or last-N rankings (US-06-02). */
export const GET = withHandler({ query: Query }, async ({ query, container }) => {
  const result = await container.useCases.getRankings.execute(query);
  if (!result.ok) throw new HttpError(400, 'VALIDATION_FAILED', 'Unknown sprint or "from" is after "to"');
  return Response.json(result.value, { headers: { 'Cache-Control': 'no-store' } });
});

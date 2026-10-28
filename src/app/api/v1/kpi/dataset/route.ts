import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import type { SprintCode } from '@/domain/kpi/sprint-code';

export const dynamic = 'force-dynamic';

const sprint = z.string().trim().toUpperCase().regex(/^S\d{1,6}$/, 'Sprint codes look like S138').transform((s) => s as SprintCode);

const Query = z.object({
  from: sprint.optional(),
  to: sprint.optional(),
  includeInactive: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
});

/**
 * GET /api/v1/kpi/dataset — score matrix + metadata for the dashboard
 * (US-04-05). ETag = revisions + query, so unchanged data answers 304.
 */
export const GET = withHandler({ query: Query }, async ({ req, query, container }) => {
  const useCase = container.useCases.getDashboardDataset;
  const etag = `"${await useCase.revisionKey()}-${query.from ?? ''}-${query.to ?? ''}-${query.includeInactive}"`;
  const cacheHeaders = { ETag: etag, 'Cache-Control': 'private, no-cache' };
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: cacheHeaders });
  const result = await useCase.execute(query);
  if (!result.ok) throw new HttpError(400, 'VALIDATION_FAILED', 'Unknown sprint or "from" is after "to"');
  return Response.json(result.value, { headers: cacheHeaders });
});

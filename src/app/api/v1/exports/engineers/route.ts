import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import { RangeQuery } from '../../kpi/_query';

export const dynamic = 'force-dynamic';

const Query = RangeQuery.extend({
  designation: z.string().max(80).optional(),
  team: z.string().max(80).optional(),
  band: z.enum(['out', 'exc', 'meet', 'ni']).optional(),
  coverage: z.enum(['all', '10', '6', 'new']).optional(),
  q: z.string().max(100).optional(),
  includeInactive: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  format: z.enum(['xlsx', 'csv']).default('xlsx'),
});

/** GET /api/v1/exports/engineers — the filtered engineer table with per-sprint columns (US-07-02). */
export const GET = withHandler({ query: Query }, async ({ query, container }) => {
  const { from, to, includeInactive, format, ...filters } = query;
  const result = await container.useCases.exportKpi.engineers({ from, to, includeInactive, format, filters });
  if (!result.ok) throw new HttpError(400, 'VALIDATION_FAILED', 'Unknown sprint or "from" is after "to"');
  const { bytes, fileName, contentType } = result.value;
  return new Response(bytes as BodyInit, {
    headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${fileName}"`, 'Cache-Control': 'no-store' },
  });
});

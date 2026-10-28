import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';
import { RangeQuery } from '../../kpi/_query';

export const dynamic = 'force-dynamic';

/** GET /api/v1/exports/rankings — workbook with Overall / By designation / Last N sheets (US-07-03). */
export const GET = withHandler({ query: RangeQuery }, async ({ query, container }) => {
  const result = await container.useCases.exportKpi.rankings(query);
  if (!result.ok) throw new HttpError(400, 'VALIDATION_FAILED', 'Unknown sprint or "from" is after "to"');
  const { bytes, fileName, contentType } = result.value;
  return new Response(bytes as BodyInit, {
    headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${fileName}"`, 'Cache-Control': 'no-store' },
  });
});

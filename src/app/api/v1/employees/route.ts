import { z } from 'zod';
import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

const Query = z.object({
  q: z.string().trim().max(100).optional(),
  teamId: z.string().max(64).optional(),
  designationId: z.string().max(64).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  cursor: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(200),
});

/** GET /api/v1/employees — list, search and filter (US-03-01). */
export const GET = withHandler({ query: Query }, async ({ query, container }) =>
  Response.json(await container.useCases.listEmployees.execute(query), { headers: { 'Cache-Control': 'no-store' } }),
);

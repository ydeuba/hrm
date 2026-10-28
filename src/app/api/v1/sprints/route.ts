import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

/** GET /api/v1/sprints — every sprint with its dates and participant count (US-03-07). */
export const GET = withHandler({}, async ({ container }) => Response.json(await container.useCases.manageSprints.list(), { headers: { 'Cache-Control': 'no-store' } }));

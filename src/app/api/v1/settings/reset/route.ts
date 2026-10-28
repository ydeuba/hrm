import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

/** POST /api/v1/settings/reset — restore the ADR-015 defaults (US-08-05). */
export const POST = withHandler({}, async ({ session, container }) => Response.json(await container.useCases.manageSettings.reset(session.userId)));

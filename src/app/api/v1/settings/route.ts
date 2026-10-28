import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

/** GET /api/v1/settings — stored settings merged over defaults (US-08-01 AC-1). */
export const GET = withHandler({}, async ({ container }) =>
  Response.json(await container.useCases.manageSettings.get(), { headers: { 'Cache-Control': 'no-store' } }),
);

/** PUT /api/v1/settings — replace settings; validated; bumps settingsRevision; audited. */
export const PUT = withHandler({ body: z.unknown() }, async ({ body, session, container }) => {
  const result = await container.useCases.manageSettings.update({ settings: body, actorId: session.userId });
  if (!result.ok) throw new HttpError(400, 'VALIDATION_FAILED', 'Some settings are invalid', result.error);
  return Response.json(result.value);
});

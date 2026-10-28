import { AuditQuerySchema, toAuditQuery } from '@/app/_lib/audit-query';
import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

/** GET /api/v1/audit?from&to&action&cursor — newest first, 50 per page (US-09-02). */
export const GET = withHandler({ query: AuditQuerySchema }, async ({ query, container }) =>
  Response.json(await container.useCases.listAuditEvents.execute(toAuditQuery(query)), { headers: { 'Cache-Control': 'no-store' } }),
);

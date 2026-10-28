import { z } from 'zod';
import { HttpError } from '@/app/_lib/http-errors';
import { withHandler } from '@/app/_lib/with-handler';

export const dynamic = 'force-dynamic';

const Body = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(1).max(1024),
});

/** POST /api/v1/auth/password — change password; other sessions are revoked (E-01-05). */
export const POST = withHandler({ body: Body }, async ({ body, session, container }) => {
  const result = await container.useCases.changePassword.execute({ userId: session.userId, tokenHash: session.tokenHash, ...body });
  if (!result.ok) {
    if (result.error === 'INVALID_CREDENTIALS') throw new HttpError(401, 'INVALID_CREDENTIALS', 'The current password is incorrect');
    throw new HttpError(400, 'WEAK_PASSWORD', 'Use at least 12 characters, different from the current password');
  }
  return new Response(null, { status: 204 });
});

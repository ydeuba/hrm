const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence on top of SameSite=Lax (ADR-006): state-changing requests must
 * carry an Origin equal to the request's own origin or one of TRUSTED_ORIGINS.
 */
export function isAllowedOrigin(req: Request, trustedOrigins: readonly string[]): boolean {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return true;
  const origin = req.headers.get('origin');
  if (!origin) return false;
  return origin === new URL(req.url).origin || trustedOrigins.includes(origin);
}

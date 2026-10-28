import 'server-only';
import type { NextRequest } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { DomainError } from '@/domain/shared/errors';
import { getContainer, type Container } from '@/infrastructure/container';
import { requireApiSession, type SessionUser } from './dal';
import { HttpError, jsonError } from './http-errors';
import { isAllowedOrigin } from './origin-check';

interface BaseContext<B, Q, P> {
  readonly req: NextRequest;
  readonly body: B;
  readonly query: Q;
  readonly params: P;
  readonly container: Container;
  readonly correlationId: string;
}

export interface HandlerContext<B, Q, P> extends BaseContext<B, Q, P> {
  readonly session: SessionUser;
}

export type PublicHandlerContext<B, Q, P> = BaseContext<B, Q, P>;

export interface HandlerOptions<B, Q> {
  readonly body?: ZodType<B>;
  readonly query?: ZodType<Q>;
}

type RouteContext<P> = { params: Promise<P> };
type RouteHandler<P> = (req: NextRequest, route?: RouteContext<P>) => Promise<Response>;

async function parseJsonBody<B>(req: NextRequest, schema: ZodType<B>): Promise<B> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Request body must be valid JSON');
  }
  return schema.parse(raw);
}

function zodDetails(error: ZodError) {
  return error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}

function toErrorResponse(error: unknown, req: NextRequest, correlationId: string, container?: Container): Response {
  if (error instanceof HttpError) {
    return jsonError(error.status, error.code, error.message, { details: error.details, headers: error.headers });
  }
  if (error instanceof ZodError) {
    return jsonError(400, 'VALIDATION_FAILED', 'Request validation failed', { details: zodDetails(error) });
  }
  if (error instanceof DomainError) {
    const status = error.code === 'VALIDATION_FAILED' ? 400 : 422;
    return jsonError(status, error.code, error.message, { details: error.details });
  }
  const log = { correlationId, method: req.method, path: req.nextUrl.pathname, err: error };
  if (container) container.logger.error(log, 'Unhandled error in route handler');
  else console.error('Unhandled error before container was ready', log);
  return jsonError(500, 'INTERNAL', 'An unexpected error occurred', { correlationId });
}

function build<B, Q, P>(
  options: HandlerOptions<B, Q>,
  authenticate: (req: NextRequest) => Promise<SessionUser | null>,
  run: (ctx: BaseContext<B, Q, P>, session: SessionUser | null) => Promise<Response>,
): RouteHandler<P> {
  return async (req, route) => {
    const correlationId = crypto.randomUUID();
    let container: Container | undefined;
    try {
      container = await getContainer();
      if (!isAllowedOrigin(req, container.env.TRUSTED_ORIGINS)) {
        throw new HttpError(403, 'CSRF_ORIGIN_MISMATCH', 'Cross-origin request rejected');
      }
      const session = await authenticate(req);
      const body = (options.body ? await parseJsonBody(req, options.body) : undefined) as B;
      const query = (options.query ? options.query.parse(Object.fromEntries(req.nextUrl.searchParams)) : undefined) as Q;
      const params = (route ? await route.params : {}) as P;
      return await run({ req, body, query, params, container, correlationId }, session);
    } catch (error) {
      return toErrorResponse(error, req, correlationId, container);
    }
  };
}

/**
 * Session-protected Route Handler (ADR-006 gate 2, ADR-011): Origin check for
 * state-changing methods, session validation (401 otherwise), Zod parsing and
 * uniform error mapping. Request bodies are never logged.
 */
export function withHandler<B = undefined, Q = undefined, P = Record<string, string>>(
  options: HandlerOptions<B, Q>,
  handler: (ctx: HandlerContext<B, Q, P>) => Promise<Response>,
): RouteHandler<P> {
  return build<B, Q, P>(options, requireApiSession, (ctx, session) => handler({ ...ctx, session: session as SessionUser }));
}

/** Route Handler that is reachable without a session (login, health) — still Origin-checked. */
export function withPublicHandler<B = undefined, Q = undefined, P = Record<string, string>>(
  options: HandlerOptions<B, Q>,
  handler: (ctx: PublicHandlerContext<B, Q, P>) => Promise<Response>,
): RouteHandler<P> {
  return build<B, Q, P>(options, async () => null, (ctx) => handler(ctx));
}

/** Uniform API error envelope (ADR-011): `{ error: { code, message, details? } }`. */
export interface ErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
    readonly correlationId?: string;
  };
}

/** An error that maps directly to an HTTP status and stable error code. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly headers?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorBody(code: string, message: string, details?: unknown, correlationId?: string): ErrorBody {
  return {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
      ...(correlationId === undefined ? {} : { correlationId }),
    },
  };
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  options: { details?: unknown; correlationId?: string; headers?: Readonly<Record<string, string>> } = {},
): Response {
  return Response.json(errorBody(code, message, options.details, options.correlationId), {
    status,
    headers: { 'Cache-Control': 'no-store', ...options.headers },
  });
}

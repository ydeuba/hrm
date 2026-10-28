# E-00-04 — Composition root, env validation & HTTP plumbing · Implementation record

## Files
- `src/infrastructure/env.ts`: Zod env schema; `loadEnv()` throws an `EnvError` naming every bad variable; `getEnv()` memoised. `DATABASE_URL` and `DATA_DIR` are required; everything else has a default.
- `src/infrastructure/startup.ts` + `src/instrumentation.ts`: validate env on server start and `process.exit(1)` on failure (Node runtime only; the import sits inside the runtime guard so the edge bundle stays clean).
- `src/infrastructure/logger.ts`: pino JSON logger with a redact list for passwords, tokens and cookies.
- `src/infrastructure/container.ts`: composition root. `createContainer(env)` / `getContainer()` (memoised on `globalThis`; a failure isn't cached).
- `src/application/ports/{clock,audit-log}.ts` + `src/infrastructure/{clock/system-clock,audit/prisma-audit-log}.ts`: the minimal AuditLog port, pulled forward from E-09-01 per backlog health note #4.
- `src/app/_lib/{http-errors,origin-check,with-handler}.ts`: error envelope, CSRF Origin check, and the handler wrapper (Zod body/query, params, error mapping, correlation-ID logging).
- `src/app/api/health/route.ts`: `GET /api/health` → `{status, db}`; 503 when the DB is down.

## Error mapping
| Thrown | HTTP | Code |
|---|---|---|
| `HttpError` | its status | its code (+ optional headers, e.g. Retry-After) |
| `ZodError` / malformed JSON | 400 | `VALIDATION_FAILED` (+ path/message details) |
| `ValidationError` | 400 | `VALIDATION_FAILED` |
| other `DomainError` | 422 | its code |
| anything else | 500 | `INTERNAL` + `correlationId`; logged with method, path and correlation ID only, never the body |

## Verification
52+3 tests green, coverage 94%, lint/typecheck/build ✓. Smoke test against `next start`: `GET /api/health` → 200 `{"status":"ok","db":"ok"}`, `X-Content-Type-Options: nosniff`, no `X-Powered-By`.

## Acceptance criteria status
- [x] AC-1: satisfied — `loadEnv` names each invalid or missing variable (unit tests); `register()` exits with code 1 and prints the message (instrumentation test).
- [x] AC-2: satisfied — an invalid body returns `400 { error: { code: 'VALIDATION_FAILED', details } }` (integration test).
- [x] AC-3: satisfied — an unexpected exception returns 500 `INTERNAL` with a `correlationId`; the logged object carries the same ID and doesn't contain the request body (asserted with a secret value).
- [x] AC-4: satisfied — non-GET requests with a foreign or missing Origin return 403 `CSRF_ORIGIN_MISMATCH`; `TRUSTED_ORIGINS` are accepted.

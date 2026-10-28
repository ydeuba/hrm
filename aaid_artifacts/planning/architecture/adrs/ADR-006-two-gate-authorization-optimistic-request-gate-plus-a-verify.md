# ADR-006: Two-gate authorization — optimistic request gate plus a verifying Data Access Layer

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: NFR-08 requires server-side enforcement on every page and API. The Next.js request gate (`middleware.ts`, renamed `proxy.ts` in Next 16) should stay cheap, and following Next.js guidance it must not be the only check.
- **Decision**: Gate 1 (`proxy.ts`/`middleware.ts`) redirects to `/login`, or returns 401 for `/api/*`, when the session cookie is **absent**. It also generates the per-request CSP nonce (see Cross-cutting). Gate 2 is `requireSession()` in `src/app/_lib/dal.ts` (marked `server-only`, wrapped in `React.cache`). It validates the token hash, expiry and idle time in the database, and **every** Server Component page, layout and Route Handler calls it. Mutating Route Handlers (non-GET) also check that the `Origin` header matches the request host, or one of `TRUSTED_ORIGINS` when that env var is set (needed behind a reverse proxy later). This is CSRF defence on top of SameSite=Lax. Unauthenticated exceptions: `/login`, `POST /api/v1/auth/login`, `GET /api/health`, static assets.
- **Consequences**: Defence in depth. A forgotten `requireSession()` is caught by an integration test that crawls every route without a cookie and expects a 401 or redirect. Requests cost one indexed database lookup, which is negligible.

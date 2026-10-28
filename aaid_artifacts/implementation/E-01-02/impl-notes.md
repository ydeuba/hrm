# E-01-02 — Two-gate route protection · Implementation record

## Files
- Gate 1: `src/proxy.ts`. Without a session cookie, a page request redirects to `/login?next=<path>` and an `/api/*` request gets 401 JSON. Public: `/login`, `/api/health`, `POST /api/v1/auth/login`. The proxy also forwards `x-pathname` for post-login redirects.
- Gate 2: `src/app/_lib/dal.ts`:
  - `getSession()` (React `cache`, one DB validation per request);
  - `requireSession()` for pages and layouts (redirects to login);
  - `requireApiSession()` for handlers (throws 401).
- `src/app/(app)/layout.tsx` calls `requireSession()`, so every page in the group is protected.
- `src/app/_lib/with-handler.ts` has two wrappers. `withHandler` is session-protected and the default; `withPublicHandler` is used only for login and health.
- `src/application/use-cases/auth/validate-session.ts` deletes expired or idle sessions on access.

## Tests
- `tests/integration/app/route-protection.test.ts` **enumerates every `route.ts` under `src/app/api`**, calls each exported method without a cookie, and asserts 401 unless the path is public. A new route that uses the wrong wrapper fails the suite.
- `tests/e2e/auth.spec.ts` **enumerates every `page.tsx` in `src/app/(app)`** and asserts that each one redirects to `/login?next=…` without a session.
- `tests/unit/app/csp-nav.test.ts` covers proxy gate behaviour (redirect, root, API 401, public paths, x-pathname).

## Acceptance criteria status
- [x] AC-1: satisfied — pages redirect to `/login?next=<path>`; APIs other than login and health return 401 (unit + integration + e2e).
- [x] AC-2: satisfied — unknown, expired or revoked tokens are rejected by gate 2, and the session row is deleted (unit + integration).
- [x] AC-3: satisfied — the API crawl and the page crawl both run automatically and fail when a route is unprotected.

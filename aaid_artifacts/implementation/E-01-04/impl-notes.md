# E-01-04 — Session expiry & logout · Implementation record

## Files
- `src/domain/auth/session-policy.ts`: `evaluateSession` (expired / idle / valid) and `shouldTouch` (5-minute write throttle).
- `src/application/use-cases/auth/{validate-session,logout}.ts`.
- `src/app/api/v1/auth/logout/route.ts` (204 + cleared cookie), `src/app/api/v1/auth/me/route.ts`, `src/components/auth/user-menu.tsx` (Log out button in the header).

## Notes
- Idle is 60 minutes (`SESSION_IDLE_MINUTES`) and the absolute lifetime is 12 hours (`SESSION_ABSOLUTE_HOURS`). Because `lastSeenAt` is written at most every 5 minutes, the effective idle timeout is 60–65 minutes (ADR-005).
- Authenticated pages are dynamic, and Next.js sends `Cache-Control: private, no-cache, no-store…` for them (asserted in e2e), so Back cannot show cached data.

## Acceptance criteria status
- [x] AC-1: satisfied — a session idle for more than 65 minutes is rejected and deleted (unit with a fake clock).
- [x] AC-2: satisfied — a session older than 12 hours is rejected even with continuous activity (unit).
- [x] AC-3: satisfied — logout deletes the session row, clears the cookie and audits `AUTH_LOGOUT` (integration); Back after logout lands on `/login` and the page is `no-store` (e2e).

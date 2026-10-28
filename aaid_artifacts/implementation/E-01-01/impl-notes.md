# E-01-01 — Login with lockout · Implementation record

Built together with E-01-02/03/04, which share a single auth design (ADR-005/006).

## Files
- Domain: `src/domain/auth/login-throttle.ts` (pure lockout policy), `src/domain/auth/session-policy.ts`.
- Application: `src/application/ports/auth.ts`, `src/application/use-cases/auth/login.ts`.
- Infrastructure: `auth/argon2-password-hasher.ts` (argon2id m=19456 t=2 p=1), `auth/crypto-token-service.ts` (32-byte base64url token, SHA-256 stored), `db/repositories/prisma-auth-repositories.ts`, container wiring.
- Presentation: `src/app/api/v1/auth/login/route.ts`, `src/app/_lib/session-cookie.ts`, `src/app/(auth)/login/page.tsx`, `src/components/auth/login-form.tsx`.
- Tests: `tests/unit/domain/auth/auth-domain.test.ts`, `tests/unit/application/auth-use-cases.test.ts`, `tests/integration/app/auth-routes.test.ts`, `tests/e2e/auth.spec.ts`.

## Design notes
- The email is normalised (trim, lower-case) for lookup and throttling.
- Unknown emails are verified against a lazily computed dummy argon2 hash. The response is identical, and the integration test measures the median timing difference at under 50 ms.
- The 5th failure inside 15 minutes still answers 401, but sets `lockedUntil = now + 15 min`. While locked, attempts get 429 with `Retry-After`, and are not verified or counted. Unknown emails are throttled the same way. Success clears the throttle row.
- The `next` redirect target is validated (`safeRedirectPath`) to prevent open redirects.
- The audit records `AUTH_LOGIN_OK`, `AUTH_LOGIN_FAIL` and `AUTH_LOCKOUT` through the AuditLog port (pulled forward in E-00-04).

## Acceptance criteria status
- [x] AC-1: satisfied — valid login redirects to `/dashboard` (e2e) and sets `hrm_session` with HttpOnly, SameSite=Lax, Max-Age=43200, Path=/, and Secure only over HTTPS (integration).
- [x] AC-2: satisfied — wrong password and unknown email both return 401 "Invalid email or password" with no cookie; `AUTH_LOGIN_FAIL` is audited; timing difference under 50 ms (integration with real argon2).
- [x] AC-3: satisfied — after 5 failures the next attempt (even with the correct password) returns 429 + `Retry-After` for 15 minutes from the 5th failure; `AUTH_LOCKOUT` is audited once (unit + integration).
- [x] AC-4: satisfied — a successful login resets the counter (unit).

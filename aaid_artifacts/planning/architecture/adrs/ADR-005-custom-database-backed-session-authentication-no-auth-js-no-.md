# ADR-005: Custom database-backed session authentication (no Auth.js, no JWT)

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: Single HR Admin role, email and password, lockout, idle and absolute expiry, server-side invalidation on logout and password change (US-01-01…04).
- **Decision**: Passwords are hashed with **argon2id via `@node-rs/argon2`** (prebuilt binaries, no node-gyp on Windows). Login issues a 256-bit random token in an `hrm_session` cookie (httpOnly, SameSite=Lax, Secure when served over HTTPS, Path=/, **Max-Age = absolute lifetime, 12 h**). Only the token's SHA-256 hash is stored in the `Session` table, with `lastSeenAt` and `expiresAt`.
  - **Idle expiry is enforced only on the server.** The timeout is 60 min. `lastSeenAt` is written at most every 5 min, so the effective idle timeout is 60–65 min, which is accepted.
  - **The DAL never writes cookies**, because Server Components cannot. On expiry it deletes the Session row and redirects; `/login` clears any stale cookie.
  - **Lockout** uses a `LoginThrottle{email, failures, windowStart, lockedUntil}` row per normalised email. The 5th failure within a 15-min window sets `lockedUntil = now + 15 min`. While locked, attempts return 429 without checking the password or adding to the count. The same logic applies to unknown emails, and an unknown email is still verified against a fixed dummy argon2 hash so response timing doesn't reveal which accounts exist. A successful login resets the row.

  Rejected alternatives: Auth.js (its credentials provider discourages database sessions and adds complexity for one role) and stateless JWT (it can't be revoked on logout or password change without a denylist).
- **Consequences**: Small, auditable, fully tested auth code that we own. Rate limiting is per email; per-IP limiting is deferred because the app runs locally. A seed script creates the first admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (US-01-03).

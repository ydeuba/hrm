# E-01-03 — Seed first HR Admin · Implementation record

## Files
- `src/application/use-cases/auth/create-initial-admin.ts`: validates the email and a password of at least 12 characters; never overwrites an existing admin.
- `scripts/seed-admin.ts` → `npm run seed:admin` (reads `ADMIN_EMAIL` / `ADMIN_PASSWORD`; exits 1 with a clear message on invalid input).
- The e2e server (`tests/e2e/start-server.ts`) seeds its own admin through the same use case.

## Verification (dev database, 2026-10-15)
- No variables → "ADMIN_EMAIL is not set." exit 1
- Password `short` → "ADMIN_PASSWORD must be at least 12 characters." exit 1
- Valid → "HR Admin … created." exit 0
- Re-run → "already exists — nothing changed." exit 0

## Acceptance criteria status
- [x] AC-1: satisfied — exactly one admin with an argon2id hash is created (unit + manual run).
- [x] AC-2: satisfied — missing or short values exit non-zero with a clear message and create nothing.
- [x] AC-3: satisfied — re-running neither duplicates the admin nor changes the password (unit + manual run).

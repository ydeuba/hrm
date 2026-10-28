# E-01-05 — Change password · Implementation record

## Files
`src/application/use-cases/auth/change-password.ts`, `POST /api/v1/auth/password`, `/account` page with `components/auth/change-password-form.tsx`; the header email now links to `/account`.

## Acceptance criteria status
- [x] AC-1: satisfied — the correct current password + a new one of ≥ 12 chars updates the hash, revokes every other session (the current one stays valid) and audits `AUTH_PASSWORD_CHANGE` (unit + integration).
- [x] AC-2: satisfied — a wrong current password → 401, nothing changes.
- [x] AC-3: satisfied — shorter than 12 or equal to the current password → 400 `WEAK_PASSWORD`.

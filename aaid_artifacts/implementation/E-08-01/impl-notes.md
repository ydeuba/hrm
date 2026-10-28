# E-08-01 — Settings storage & validation API · Implementation record

## Shared implementation
- Application: `use-cases/settings/settings-use-cases.ts` (ManageSettings: get / update / reset), `contracts/settings.ts` (Zod schema + defaults merge), port `SettingsWriter`.
- Infrastructure: `prisma-settings-repository.ts` (save + settingsRevision bump in one transaction).
- API: `GET|PUT /api/v1/settings`, `POST /api/v1/settings/reset`.
- UI: `/settings` with `components/settings/settings-form.tsx` (bands editor with live "N engineers would change band" preview, parameters with help text, reset confirm).
- Tests: `tests/integration/app/settings.test.ts`, `tests/e2e/settings.spec.ts` (incl. axe).

## Acceptance criteria status
- [x] AC-1: satisfied — GET returns stored settings merged over the ADR-015 defaults (invalid stored keys fall back to defaults).
- [x] AC-2: satisfied — invalid values → 400 with field errors (non-descending bands, lastNWindow outside 1–20, negative tolerances, lastNMinSprints > window).
- [x] AC-3: satisfied — a valid PUT bumps settingsRevision and writes SETTINGS_UPDATE with before/after.

# E-08-05 — Reset settings to defaults · Implementation record

## Shared implementation
- Application: `use-cases/settings/settings-use-cases.ts` (ManageSettings: get / update / reset), `contracts/settings.ts` (Zod schema + defaults merge), port `SettingsWriter`.
- Infrastructure: `prisma-settings-repository.ts` (save + settingsRevision bump in one transaction).
- API: `GET|PUT /api/v1/settings`, `POST /api/v1/settings/reset`.
- UI: `/settings` with `components/settings/settings-form.tsx` (bands editor with live "N engineers would change band" preview, parameters with help text, reset confirm).
- Tests: `tests/integration/app/settings.test.ts`, `tests/e2e/settings.spec.ts` (incl. axe).

## Acceptance criteria status
- [x] AC-1: satisfied — Reset (after confirmation) restores the ADR-015 defaults and is audited.
- [x] AC-2: satisfied — Cancel in the dialog changes nothing.

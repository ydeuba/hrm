# Project Memory

<!-- Accumulated, agent-written project knowledge that persists across sessions. -->
<!-- aaid never overwrites this file — it only appends. Keep entries terse and dated. -->
<!-- Add via `aaid remember "<note>" -t <type>` or the /aaid-remember chat command. -->

## Decisions

_Architectural and product choices, and the reason behind each._

- 2026-10-15: v1 scope = single HR Admin login + Excel KPI import + KPI dashboard (Next.js, FE+BE in one folder). Leave/payroll/appraisal workflows/other roles are out of scope. Why: user wants a minimal first release.
- Runs locally first (SQLite via ORM, portable to PostgreSQL); user will deploy to a server manually later.
- Requirements: `aaid_artifacts/planning/requirements/requirements.md`. The original target release was 2026-11-13.
- Backlog (`aaid_artifacts/planning/backlog/backlog.md`): 60 stories / 192 pts, assuming 50 pts/sprint with AI assistance. Re-baseline ACCEPTED 2026-10-15: MVP demo 2026-11-13, v1.0 2026-11-27, v1.1 2026-12-11. Story IDs use the form E-XX-YY (not STORY-NNN). They were loaded into `.aaid/state.json` by script, because `aaid epic add` and `aaid story add` are interactive prompts.
- Architecture: `aaid_artifacts/planning/architecture/architecture.md` (ADR-001…015). Key choices:
  - Prisma + SQLite in `./data`.
  - Scores stored as integer hundredths with a status of SCORED, RUN or NOT_SCORED.
  - Custom DB-session auth using argon2id.
  - Two-phase import (preview → commit) with a change journal for rollback.
  - `src/domain` is pure TypeScript shared by server and browser.
  - Chart.js + Tailwind using the reference colours; PDF via print CSS.

## Gotchas & Bugs

_Non-obvious failures and what to do instead._

- Do NOT install `xlsx` from npm. 0.18.5 has known vulnerabilities (CVE-2023-30533 and CVE-2024-22363) and would fail the security gate. Install SheetJS ≥0.20.3 from https://cdn.sheetjs.com/ (ADR-008).
- The `rank` values in the reference HTML are stale; they came from an older sheet (e.g. Jeevan Joshi has a 9.07 average but rank 42). Never assert against them. Golden ranks come from the workbook's "Overall Rankings" block (ADR-014).
- Precision (ADR-016): the sheet ranks on the EXACT average (Mandip, a true 9.00, is ranked above Sajjan, who shows 9.00 but is 8.9956). Bands use the 2-dp average. Convert scores with `Math.round(v*100 + 1e-7)`, because naïve rounding fails for values such as 1.005 (×100 = 100.4999…); 5.975 itself rounds correctly.
- NEVER rewrite files with Windows PowerShell `Get-Content`/`Set-Content`. PS 5.1 reads UTF-8 as cp1252 and writes a BOM, which turns `—` into `â€”`. Use the Edit tool or Node instead.
- aaid gates and Next.js conventions (2026-10-15):
  - `test-files-exist` requires a co-located `x.test.ts` for EVERY `src/**/*.ts(x)` file;
  - `security-headers` only recognises helmet or `setHeader(` (Express style);
  - `pattern-documented` and `security-agent-coverage` need CLI agent runs (`aaid run architect` / `aaid run security`, which need an API key).
  These are not satisfied by chat-produced artifacts. The generated Prisma client lives in `/generated` (outside `src`) so the banned-pattern scan ignores it.
- Next.js 16 renamed `middleware.ts` to `proxy.ts`.
- Pinned toolchain (E-00-01):
  - next 16.4.1 (so the gate file is `proxy.ts`), react 19.3.1
  - **typescript 6.0.3, not 7**: TS 7 has only an unstable API, which typescript-eslint and the Next type-check can't use
  - prisma and @prisma/client **7.10.0** (npm `latest` is an 8.0 RC — don't use it), @prisma/adapter-better-sqlite3 7.10.0 + better-sqlite3 ^12
  - SheetJS from the CDN tgz 0.20.3
  - @node-rs/argon2 2.2.2
- npm here enforces `allowScripts`. Run `npm install-scripts approve better-sqlite3 prisma @prisma/engines esbuild`, otherwise native binaries are missing.
- The Prisma 7 CLI pulls in vulnerable `deepmerge-ts` and `mysql2`. Keep the package.json `overrides` `"deepmerge-ts": "^8.0.2", "mysql2": "^3.24.6"` to keep `npm audit` at 0.
- Prisma 7: the datasource URL goes in `prisma.config.ts`; the generator is `prisma-client` with an `output`; `migrate dev` does NOT run generate (run `prisma generate` explicitly); the client needs an `adapter`. It is only an optimistic cookie check; every page and handler must still call `requireSession()` (ADR-006).

- e2e specs share one fresh DB per run, in alphabetical order with 1 worker: `kpi-dashboard.spec.ts` performs the sample import, and destructive flows live in `z-data-maintenance.spec.ts` so they run last. Running a later spec alone fails for lack of data, so run it together with `kpi-dashboard.spec.ts`.
- Vitest: integration files each argon2-hash and import in `beforeAll`; keep `maxWorkers: '50%'` and `hookTimeout: 60_000`, or hooks time out and the login-timing test flakes.
- SheetJS `CFB.find` fails on nested zip paths and ignores the UTF-8 name flag; look entries up via `FullPaths`/`FileIndex` in tests.
- Dashboard dataset p95 varies 184–350 ms between sessions on the same code (laptop thermal/power state). Compare against the 500 ms limit, not between runs.

## Patterns & Conventions

_Project-specific patterns worth following._

- Score-changing operations (merge, correction, erasure, employee edits) bump `scoreRevision`, which blocks rollback. Non-score metadata (sprint dates, settings) bumps `settingsRevision` instead, which only refreshes caches.
- Erasure (ADR-017) redacts by needles (ID, names, aliases, code, email), and audit rows whose entityId is the person lose their whole payload.
- Print views live under `src/app/(print)` (session required, no shell); use `AutoPrint` (`?autoprint=0` disables it for tests).

## Domain

_Domain language, business rules, and external-system quirks._

- Source file: `KPI Master Sheet (2).xlsx`. The worksheet is named "Compile Sheet " (with a trailing space). Header: S.N | Resources | Teams | Designation | S122…S141 | Total | Average. Section rows (TEAM LEAD/SSE/SE/ASE) are not people. Scores come from external team workbooks, so read cached values only.
- Cell values: numeric 0–10; `RUN` and `N/A` are excluded from calculations (never treated as 0). Empty future sprint columns (S139–S141) must be ignored.
- Rating bands: ≥8 Outstanding, 6–<8 Exceeds, 5–<6 Meets, <5 Needs Improvement. Momentum = last 3 − prior 3 scored sprints, only when 6+ sprints are scored. Team/designation averages are weighted (Σ scores ÷ number of scores). Top-10 requires ≥5 sprints. Last-N ranking window defaults to 6.
- Names are inconsistent (`Niva  Awale` with a double space, `Surya joshi`), and team names differ between sheets (`Team Bimal` vs `Bimal`). There is no employee ID, so match on the normalised name.

## Notes

_Anything else worth remembering next session._

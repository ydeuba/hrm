# Product Backlog — hrm (Cloudtech HRM & Engineering KPI Dashboard)

**Date:** 2026-10-15 · **Product owner:** HR · **Sponsor:** Management · **Team:** 1 developer, AI-assisted (aaid `/aaid-dev-story`)
**Sources:** [requirements.md](../requirements/requirements.md) (US-XX-YY) · [architecture.md](../architecture/architecture.md) (ADR-001…018) · [architecture review](../architecture/review.md)

---

## Backlog Overview

The backlog has **10 epics and 60 stories, totalling 192 story points**. It is the 9 functional epics from the requirements plus **E-00 Platform Foundation**, which the requirements did not have and which holds the scaffold, schema, quality gates and golden test fixtures the architecture requires. The 37 requirements stories became 60 backlog stories for two reasons: every story above 5 points that mixed several concerns was split, and the review findings were added as stories (alias identity, field locks, erasure, revision guard, performance benchmarks, restore). Story sizes are **S 1–2 pts: 32% (19)**, **M 3 pts: 40% (24)** and **L 5 pts: 28% (17)**. There are **no stories above 5 points**.

**Velocity assumption: 50 points per 2-week sprint.** That assumes one developer working with AI-generated implementation (`/aaid-dev-story`) and the review and test gates. An unassisted developer would typically manage 20–30 points; if the first sprint's actual velocity comes in below 40, re-plan. At 50 points per sprint:
- **P1 (113 pts)** needs about **2.3 sprints**.
- **P1 + P2 (161 pts)** needs about **3.2 sprints**.
- **The full backlog (192 pts)** needs about **3.9 sprints**.

**The 13 November 2026 date in the requirements is therefore not achievable for the full v1.0 scope.** Recommended re-baseline:
- **Milestone 1, MVP demo, 13 November 2026** (end of Sprint 2): import → dashboard working end to end on real data.
- **v1.0 release, 27 November 2026** (end of Sprint 3): all P1 plus most P2.
- **v1.1, 11 December 2026** (end of Sprint 4): the rest of P2 plus P3/P4.

**Sequencing constraints:**
- E-00 must come first: the schema, composition root and fixtures underpin everything.
- The E-04 KPI engine is pure domain code with no I/O, so it can be built and golden-tested in Sprint 1 before the import exists.
- E-02 import requires E-00-03 (schema) and E-04-03 (precision rules for the data-check).
- The E-05 dashboard requires E-04-05 (dataset API) and at least one committed import.
- E-08 settings and E-09 audit are cross-cutting but deferrable: domain defaults (ADR-015) let everything else work without the settings UI.

**Recommended Sprint 1 focus:** a secured app shell plus a KPI engine whose numbers are proven against the workbook. This removes the biggest risk first (wrong numbers in appraisals) without depending on the import UI.

---

## Epics

**E-00: Platform Foundation**
- Priority: P1 Critical
- Description: The Next.js scaffold with strict TypeScript, clean-architecture boundaries, the full Prisma schema, the composition root, the HTTP plumbing, the app shell and golden fixtures. Nothing else can be built or verified without it, and the aaid quality gates (80% coverage, 0 lint errors, complexity ≤ 10) are wired in here.
- Estimated Stories: 6
- Total Story Points: 20
- Sprint Estimate: 0.4
- Dependencies: None
- Success Metric: `npm run verify` (typecheck, lint, test and build) passes on a clean clone in ≤ 5 minutes.

**E-01: HR Admin Authentication & Access**
- Priority: P1 Critical
- Description: A secure single-role login, session lifecycle and two-gate route protection, so that performance data is only visible to HR. This is a precondition for using real employee data anywhere.
- Estimated Stories: 5
- Total Story Points: 14
- Sprint Estimate: 0.3
- Dependencies: E-00
- Success Metric: 100% of non-public routes return a 401 or redirect without a valid session (automated route crawl).

**E-04: KPI Calculation Engine**
- Priority: P1 Critical
- Description: One pure-TypeScript implementation of every business rule: metrics, bands, rankings with exact-precision comparison, weighted groups, trend, sprint windows and the dataset API. It is the source of truth Management will rely on for appraisals.
- Estimated Stories: 7
- Total Story Points: 25
- Sprint Estimate: 0.5
- Dependencies: E-00 (fixtures, schema for the dataset API)
- Success Metric: 100% of golden assertions pass (±0.01) against `KPI Master Sheet (2).xlsx` and the reference HTML.

**E-02: Excel KPI Import & Validation**
- Priority: P1 Critical
- Description: Upload the KPI Master Sheet, detect its structure, validate it, preview the changes, then commit atomically with a journal that allows rollback. This replaces hours of manual compiling and catches spreadsheet formula errors.
- Estimated Stories: 9
- Total Story Points: 38
- Sprint Estimate: 0.8
- Dependencies: E-00, E-01-02, E-04-01..03
- Success Metric: The sample workbook imports with 49 employees and 17 sprints, and preview → commit takes ≤ 10 minutes of HR time.

**E-05: KPI Dashboard**
- Priority: P1 Critical
- Description: An interactive org dashboard that matches the reference report: cards, filters, charts, momentum and a sortable table. It is the main way Management consumes the system.
- Estimated Stories: 6
- Total Story Points: 19
- Sprint Estimate: 0.4
- Dependencies: E-04-05, E-02-07
- Success Metric: Filter changes repaint in ≤ 300 ms, and every number on the dashboard matches the golden fixtures.

**E-06: Engineer Profile & Rankings**
- Priority: P1 Critical
- Description: A per-engineer drill-down and ranking views that replace the Excel ranking blocks and Performance Insights sheet, used to prepare appraisal conversations.
- Estimated Stories: 5
- Total Story Points: 16
- Sprint Estimate: 0.3
- Dependencies: E-04-03, E-05-05
- Success Metric: Overall, designation and last-N rankings match the workbook ranking blocks 100%.

**E-07: Reports & Export**
- Priority: P2 High
- Description: Print-to-PDF of the dashboard and appraisal summaries, plus Excel/CSV exports, so Management can circulate results outside the app.
- Estimated Stories: 5
- Total Story Points: 13
- Sprint Estimate: 0.3
- Dependencies: E-05, E-06
- Success Metric: Dashboard and profile PDFs fit A4 with no split panels; exports open in Excel with no formula injection.

**E-03: Employee, Team & Sprint Master Data**
- Priority: P2 High
- Description: HR maintenance of employees, teams and designations, with alias-based identity and field locks (ADR-018), plus merge, score correction and privacy erasure. This keeps data correct between imports.
- Estimated Stories: 7
- Total Story Points: 26
- Sprint Estimate: 0.5
- Dependencies: E-02-07
- Success Metric: Zero duplicate employees or teams created by re-importing after a rename, verified by an integration test.

**E-08: Settings & Configuration**
- Priority: P2 High
- Description: HR-editable rating bands and calculation parameters, so that answers to the open policy questions (OQ-04…07) need no developer.
- Estimated Stories: 5
- Total Story Points: 10
- Sprint Estimate: 0.2
- Dependencies: E-04
- Success Metric: A threshold change is reflected on the dashboard within one page load, without a re-import.

**E-09: Audit & Data Governance**
- Priority: P2 High
- Description: An append-only audit trail, backup and restore, and upload retention, for accountability and recoverability of sensitive performance data.
- Estimated Stories: 5
- Total Story Points: 12
- Sprint Estimate: 0.3
- Dependencies: E-00, E-01
- Success Metric: 100% of the auditable actions listed in US-09-01 produce an audit row; a backup restores with identical row counts.

---

## Standard Definition of Done (applies to every story)

1. All acceptance criteria are demonstrated by automated tests: unit tests for domain and application code, integration tests for handlers and repositories, and e2e tests where the story is UI-facing.
2. `npm run verify` is green: typecheck strict, 0 ESLint errors, complexity ≤ 10, coverage ≥ 80% overall (100% branch coverage for `src/domain`).
3. No layer-boundary violations (ESLint boundaries rule).
4. Code reviewed via `/aaid-review <STORY-ID>` with verdict APPROVED or APPROVED_WITH_COMMENTS.
5. README / docs updated if setup, environment variables or behaviour changed; no feature flags are used in v1.
6. Story status updated in `aaid_artifacts/sprint-status.yaml`.

Each story below lists only its **additional** DoD items.

---

## Product Backlog

### E-00 — Platform Foundation

**E-00-01 — Toolchain verification spike**
- As the developer, I want to prove the risky dependencies install and run on Node 24 / Windows, so that Sprint 1 isn't blocked mid-way by native-binary or registry problems.
- Story Points: 1 — Priority: P1 — Labels: spike
- Acceptance Criteria:
  - AC-1: Given a scratch project, when I install SheetJS ≥ 0.20.3 from `cdn.sheetjs.com`, then `npm audit` reports 0 high/critical issues and it reads `KPI Master Sheet (2).xlsx`.
  - AC-2: Given Prisma ≥ 6.2 with the SQLite driver adapter, when I run a migration and a query on Node 24 win32, then it succeeds; otherwise the libSQL adapter fallback is confirmed working.
  - AC-3: Given `@node-rs/argon2`, when I hash and verify a password on win32, then it succeeds without node-gyp.
  - AC-4: The exact Next.js, React, Prisma and adapter versions chosen are recorded in `.aaid/memory.md`.
- Definition of Done: Standard (tests not required for the spike) + findings note.
- Dependencies: None
- Notes: Time-box 4 hours. If Next 16 introduces breaking changes to `proxy.ts`, record which file name is used.

**E-00-02 — Project scaffold & quality gates**
- As the developer, I want a scaffolded Next.js app with strict TypeScript, Tailwind, ESLint boundaries, Vitest and Playwright, so that every later story ships against enforced quality gates.
- Story Points: 5 — Priority: P1 — Labels: chore
- Acceptance Criteria:
  - AC-1: Given a clean clone, when I run `npm ci && npm run verify`, then typecheck, lint, unit tests and build all pass.
  - AC-2: Given a file in `src/domain` that imports from `src/infrastructure` or `next/*`, when lint runs, then it fails with a boundaries error.
  - AC-3: Given a function with cyclomatic complexity 11, when lint runs, then it fails.
  - AC-4: The folder structure matches the architecture's "Folder structure" section; `data/` and `.env*` are git-ignored; `.env.example` documents every environment variable.
- Definition of Done: Standard + README "Getting started".
- Dependencies: E-00-01
- Notes: Initialise git (the repo is not under version control yet).

**E-00-03 — Database schema & migrations**
- As the developer, I want the full Prisma schema and initial migration for every entity in the data model, so that features don't trigger repeated schema churn.
- Story Points: 5 — Priority: P1 — Labels: chore
- Acceptance Criteria:
  - AC-1: Given an empty `DATA_DIR`, when I run `prisma migrate deploy`, then all 18 tables from the architecture's Data Model Overview exist with their indexes and unique constraints.
  - AC-2: Given app start, when the Prisma client connects, then `PRAGMA journal_mode` returns `wal` and `foreign_keys` returns `1`.
  - AC-3: Given the seed script, when run, then designations Team Lead/SSE/SE/ASE (with CANONICAL aliases and sort orders 1–4), the `SystemState` row (revisions 0/0) and the default `AppSettings` exist, and re-running creates no duplicates.
  - AC-4: An integration test helper creates an isolated temporary database per test file.
- Definition of Done: Standard + ER diagram verified against the schema.
- Dependencies: E-00-02
- Notes: The 18 tables include LoginThrottle, TeamAlias and DesignationAlias, and SystemState with two revisions (review fixes). The rule that `valueCenti` is present only when SCORED is enforced in the repository plus tests.

**E-00-04 — Composition root, env validation & HTTP plumbing**
- As the developer, I want `container.ts`, Zod-validated env, the `withHandler` wrapper, the error envelope and structured logging, so that every endpoint is thin, consistent and safe by default.
- Story Points: 3 — Priority: P1 — Labels: chore
- Acceptance Criteria:
  - AC-1: Given an invalid or missing required env var, when the app starts, then it exits with a message naming the variable.
  - AC-2: Given a handler wrapped with `withHandler({ body: schema })`, when the body is invalid, then it returns `400 { error: { code: 'VALIDATION_FAILED', details } }`.
  - AC-3: Given an unexpected exception, then the response is `500 { error: { code: 'INTERNAL', message, correlationId } }` and the log line contains the same correlation ID but no request body.
  - AC-4: Given a non-GET request whose `Origin` doesn't match the host or `TRUSTED_ORIGINS`, then it returns 403 `CSRF_ORIGIN_MISMATCH`.
- Definition of Done: Standard.
- Dependencies: E-00-02
- Notes: The container is memoised on `globalThis` in dev for hot reloads.

**E-00-05 — App shell, design tokens & security headers**
- As an HR Admin, I want a consistent branded shell with navigation, so that the tool feels like the familiar Cloudtech KPI report and is easy to move around.
- Story Points: 3 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given any authenticated page, then a navy header (`#10233F`) with a teal top border shows the product name and nav links (Dashboard, Rankings, Imports, Employees, Settings, Audit), and the active link is indicated by more than colour alone.
  - AC-2: Given any response, then a per-request CSP with a nonce is set by `proxy.ts`, plus `X-Content-Type-Options`, `Referrer-Policy` and `frame-ancestors 'none'`.
  - AC-3: Given a 360 px wide viewport, then there is no horizontal scroll and the nav collapses into a menu button that works by keyboard.
- Definition of Done: Standard + accessibility check (axe) with 0 serious violations.
- Dependencies: E-00-02
- Notes: Design tokens come from ADR-010.

**E-00-06 — Golden test fixtures**
- As the developer, I want reference fixtures with expected KPI outputs, so that every calculation can be proven against the numbers Management already trusts.
- Story Points: 3 — Priority: P1 — Labels: chore
- Acceptance Criteria:
  - AC-1: `tests/fixtures/kpi-master-sheet.xlsx` (a copy of the sample) and `expected-workbook.json` contain, per employee: total, average, sprints, overall rank (from the "Overall Rankings" block), and last-6 average and count; plus the Performance Insights team, designation and trend figures.
  - AC-2: `reference-s122-s135.json` contains the HTML `RAW` records with expected total, average, last-3, prior-3, momentum, best, worst, spread and band. **Rank is excluded** (ADR-014).
  - AC-3: A generator script reproduces the expected JSON from the workbook's cached values, and its output is committed.
  - AC-4: Boundary fixtures cover: an average of 7.995 (band Outstanding); exact 9.00 vs 8.9956 ordering; the `5.975` cell; RUN-only rows; a single-sprint engineer.
- Definition of Done: Standard.
- Dependencies: E-00-02
- Notes: The fixture contains real employee names, so it must stay in a private repo (privacy).

### E-01 — HR Admin Authentication & Access

**E-01-01 — Login with lockout**
- As an HR Admin, I want to sign in with my email and password, so that only authorised HR staff can see employee performance data.
- Story Points: 5 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given valid credentials, when I submit `/login`, then I land on `/dashboard` and an `hrm_session` cookie is set (httpOnly, SameSite=Lax, Max-Age 12 h, Secure on HTTPS).
  - AC-2: Given wrong credentials, or an email that doesn't exist, then I see "Invalid email or password", the response time is within ±50 ms of a valid-email failure (dummy-hash verify), and an `AUTH_LOGIN_FAIL` audit row is written.
  - AC-3: Given 5 failures for one email within 15 minutes, when I try again (even with the correct password), then I get 429 with a retry time and a lockout message, and the lockout lasts 15 minutes from the 5th failure.
  - AC-4: Given a successful login, then the throttle counter for that email resets.
- Definition of Done: Standard + Playwright login test.
- Dependencies: E-00-03, E-00-04
- Notes: The audit insert can be a minimal direct write until E-09-01 formalises the AuditLog port.

**E-01-02 — Two-gate route protection**
- As an HR Admin, I want every page and API protected on the server, so that data can't be reached by skipping the login screen.
- Story Points: 3 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given no cookie, when I request any page except `/login`, then I am redirected to `/login?next=<path>`; any `/api/*` except login and health returns 401.
  - AC-2: Given a cookie with an unknown, expired or revoked token, when I request a page, then `requireSession()` deletes the session row (if any) and redirects to `/login`.
  - AC-3: An automated test enumerates every route under `src/app` and asserts 401 or redirect without a session (the test fails when a new route forgets `requireSession()`).
- Definition of Done: Standard.
- Dependencies: E-01-01
- Notes: Use `middleware.ts` or `proxy.ts` depending on the E-00-01 outcome.

**E-01-03 — Seed first HR Admin**
- As the installer, I want to create the first HR Admin from environment variables, so that no default password ever ships.
- Story Points: 2 — Priority: P1 — Labels: chore
- Acceptance Criteria:
  - AC-1: Given `ADMIN_EMAIL` and `ADMIN_PASSWORD` (≥ 12 chars), when I run `npm run seed:admin`, then exactly one admin with an argon2id hash exists.
  - AC-2: Given the variables are missing or the password is too short, then the command exits non-zero with a clear message and creates nothing.
  - AC-3: Given an admin already exists with that email, then re-running neither duplicates the admin nor changes the password.
- Definition of Done: Standard + README section.
- Dependencies: E-00-03
- Notes: OQ-08 (how many admins) doesn't block this; additional admins can be created by running the same command with a different email.

**E-01-04 — Session expiry & logout**
- As an HR Admin, I want idle sessions to expire and to be able to log out, so that an unattended laptop doesn't expose data.
- Story Points: 2 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given no activity for more than 65 minutes, when I interact, then I am redirected to `/login`.
  - AC-2: Given a session older than 12 hours, then it is rejected regardless of activity.
  - AC-3: Given I click "Log out", then the session row is deleted, the cookie is cleared, `AUTH_LOGOUT` is audited, and navigating back shows no data (pages are `Cache-Control: no-store`).
- Definition of Done: Standard (use a fake clock in tests).
- Dependencies: E-01-02
- Notes: `lastSeenAt` is written at most every 5 minutes (ADR-005).

**E-01-05 — Change password**
- As an HR Admin, I want to change my password, so that I can rotate credentials.
- Story Points: 2 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the correct current password and a new password of ≥ 12 characters, then the password changes, all other sessions are revoked, and `AUTH_PASSWORD_CHANGE` is audited.
  - AC-2: Given a wrong current password, then 401 and nothing changes.
  - AC-3: Given a new password equal to the current one or shorter than 12 characters, then 400 `WEAK_PASSWORD`.
- Definition of Done: Standard.
- Dependencies: E-01-04
- Notes: The UI is the `/account` page.

### E-04 — KPI Calculation Engine

**E-04-01 — Per-engineer metrics**
- As Management, I want each engineer's total, average, last 3, prior 3, momentum, best, worst and variability computed by one rule set, so that every figure in an appraisal is consistent.
- Story Points: 5 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given cells containing RUN and NOT_SCORED, when metrics are computed, then those cells are excluded from every metric and `runSprints` counts the RUN cells.
  - AC-2: Given fewer than `momentumMinSprints` (6) scored sprints, then momentum is null; with ≥ 6, momentum = mean(last 3) − mean(prior 3).
  - AC-3: Given the reference S122–S135 fixture, then every engineer's total, average, last-3, prior-3, momentum, best, worst and spread match `reference-s122-s135.json` to ±0.01.
  - AC-4: The module has no imports outside `src/domain` and has 100% branch coverage.
- Definition of Done: Standard.
- Dependencies: E-00-06
- Notes: Totals are integer centi values (ADR-004).

**E-04-02 — Rating bands**
- As Management, I want ratings assigned from consistent thresholds, so that ratings are comparable across teams.
- Story Points: 2 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the default bands, then 8.00 → Outstanding, 7.99 → Exceeds, 6.00 → Exceeds, 5.99 → Meets, 4.99 → Needs Improvement, and no scores → N/A.
  - AC-2: Given an exact average of 7.995, then the band is computed from the 2-dp value 8.00 → Outstanding (ADR-016).
  - AC-3: Given bands that don't descend strictly or lie outside 0–10, then `validateBands` returns an error.
- Definition of Done: Standard.
- Dependencies: E-04-01
- Notes: Band labels come from settings.

**E-04-03 — Rankings with exact-precision comparison**
- As Management, I want rankings that match the master sheet exactly, so that nobody's appraisal rank changes because of software rounding.
- Story Points: 5 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the workbook fixture, then the overall ranks equal the Compile Sheet "Overall Rankings" for all 49 employees (e.g. Mandip at 9.00 ranks above Sajjan, who shows 9.00 but is actually 8.9956).
  - AC-2: Given two engineers with identical exact averages and totals, then they share a rank and the next rank is skipped (1, 2, 2, 4).
  - AC-3: Given `groupBy: 'designation'`, then ranks restart at 1 within each designation; given `minSprints = 5`, then engineers below it get `eligible = false` and `rank = null`.
  - AC-4: Given `lastNWindow(6)`, then the window is the 6 most recent sprints that have any score (S133–S138 on the fixture), and last-N averages match Sheet1 column C.
- Definition of Done: Standard.
- Dependencies: E-04-01
- Notes: Use integer cross-product comparison and no floats (ADR-016).

**E-04-04 — Group aggregates & sprint trend**
- As Management, I want weighted team and designation averages and a per-sprint trend, so that I can compare groups fairly and see the direction over time.
- Story Points: 3 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the workbook fixture, then the team summary (people, score observations, total, weighted average, rank) matches the Performance Insights sheet (e.g. DevOps: 7 people, 41 observations, 8.97, rank 1).
  - AC-2: Given the fixture, then the designation summary matches (e.g. ASE: 20 people, 197 observations, 7.64).
  - AC-3: Given the fixture, then the sprint trend average and participants match (e.g. S138: 8.41 with 47 participants), and sprints with no scores have a null average, not 0.
  - AC-4: Coverage = participants ÷ active engineers, so S138 coverage = 95.9%.
- Definition of Done: Standard.
- Dependencies: E-04-01
- Notes: None.

**E-04-05 — Dashboard dataset query & API**
- As an HR Admin, I want the dashboard data served in one compact, cached response, so that the dashboard loads quickly and filters instantly.
- Story Points: 5 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given committed data, when `GET /api/v1/kpi/dataset` is called, then it returns `KpiDatasetDto` with cells encoded as `number | 'R' | null`, sprints in numeric order, server-computed overall ranks and the data-check summary.
  - AC-2: Given an unchanged `scoreRevision.settingsRevision`, when the request carries the matching `If-None-Match`, then the response is 304.
  - AC-3: Given 500 × 200 seeded engineers × sprints, then the response is ≤ 500 ms p95 and ≤ 0.7 MB uncompressed.
  - AC-4: Given `includeInactive=false` (the default), then inactive employees are excluded.
- Definition of Done: Standard.
- Dependencies: E-04-03, E-04-04, E-00-03, E-01-02
- Notes: In-process LRU cache keyed by revisions and range.

**E-04-06 — Sprint-range selection**
- As an HR Admin, I want to restrict every metric to a from/to sprint range, so that I can produce figures for a specific appraisal period.
- Story Points: 3 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given `from=S130&to=S135`, then metrics, ranks, trend and groups use only those sprints.
  - AC-2: Given from > to, or an unknown sprint code, then 400 `VALIDATION_FAILED`.
  - AC-3: Given no range, then all sprints are used.
- Definition of Done: Standard.
- Dependencies: E-04-05
- Notes: The UI control is in E-05-02.

**E-04-07 — Performance benchmarks**
- As the developer, I want automated performance checks, so that NFR-01…04 stay true as the code grows.
- Story Points: 2 — Priority: P2 — Labels: chore
- Acceptance Criteria:
  - AC-1: Given a synthetic 500 × 200 dataset, then `computeDashboard` runs in ≤ 100 ms (Vitest threshold test).
  - AC-2: Given a generated 200-row, about 5 MB workbook, then parse plus diff takes ≤ 5 s.
  - AC-3: The benchmarks run under `npm run test:perf` and are documented.
- Definition of Done: Standard.
- Dependencies: E-04-05, E-02-04
- Notes: Thresholds are tuned for the dev laptop; record the machine spec.

### E-02 — Excel KPI Import & Validation

**E-02-01 — Secure upload & original-file storage**
- As an HR Admin, I want to upload the master sheet safely, so that a wrong or malicious file can't harm the system.
- Story Points: 3 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given `Content-Length` > 5 MB, then 413 `IMPORT_TOO_LARGE` is returned before the body is read.
  - AC-2: Given a `.xlsm`, an encrypted workbook, a wrong magic number, or a ZIP whose uncompressed size is over 50 MB or has more than 200 entries, then 400 `IMPORT_INVALID_FILE` with a specific reason.
  - AC-3: Given a valid file, then it is stored at `DATA_DIR/uploads/<sha256>.<ext>` outside the web root, and the hash is returned.
- Definition of Done: Standard + security test cases in the suite.
- Dependencies: E-00-04, E-01-02
- Notes: ADR-008.

**E-02-02 — Sheet & header detection**
- As an HR Admin, I want the system to find the right sheet and columns automatically, so that I can upload the workbook exactly as HR maintains it.
- Story Points: 5 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the sample workbook, then the sheet named `"Compile Sheet "` (trimmed match) is chosen, the header is found on row 1, and sprints S122–S138 are detected; S139–S141 are ignored because they are empty.
  - AC-2: Given a workbook without a Compile Sheet, then the first sheet whose first 10 rows contain "Designation" and an `^S\d+$` column is used, and the preview names it.
  - AC-3: Given no such header, then 400 `IMPORT_NO_HEADER` with guidance text.
  - AC-4: Given an optional "Code" or "Employee Code" column, then it is mapped (ADR-018). The ranking blocks, the helper columns, and the Performance Insights and Sheet1 sheets are ignored.
- Definition of Done: Standard.
- Dependencies: E-02-01, E-00-06
- Notes: The `.csv` fallback uses the same locator.

**E-02-03 — Cell parsing & row validation**
- As an HR Admin, I want every cell interpreted correctly and bad values reported, so that averages are never distorted by RUN, N/A or typos.
- Story Points: 5 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given `RUN` → RUN; `N/A`, `NA`, `-`, blank or `#DIV/0!` → NOT_SCORED; a number from 0 to 10 → SCORED in centi, using half-up rounding (`5.975` → 598 with a `PRECISION_ROUNDED` warning).
  - AC-2: Given a value outside 0–10 or non-numeric text, then an ERROR issue with its row and column, and the preview reports `canCommit=false`.
  - AC-3: Given section rows (TEAM LEAD, SSE, SE, ASE, QA, BA, LEAD) or rows without a name or designation, then they are skipped.
  - AC-4: Given two rows with the same normalised name (and no code column), then a `DUPLICATE_NAME` error.
- Definition of Done: Standard.
- Dependencies: E-02-02
- Notes: Normalise names with NFC, trim and collapse whitespace (`Niva  Awale` → `niva awale`).

**E-02-04 — Identity matching & diff engine**
- As an HR Admin, I want the import compared against what's already stored, so that I see exactly who and what will change.
- Story Points: 5 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given an existing employee whose alias matches the file name (case or whitespace differences included), then the row is matched, not created.
  - AC-2: Given a file name within edit distance ≤ 2 of an existing employee but not an alias, then a `NEAR_DUPLICATE` is listed for confirmation.
  - AC-3: Given team or designation names, then they resolve through TeamAlias/DesignationAlias, and unknown ones are listed as "new team" or "new designation".
  - AC-4: The diff reports: new employees, matched, attribute changes, `LOCKED_FIELD_DIFFERS` warnings, new sprints, scores added, changed and unchanged, and not-in-file, with the counts summing correctly.
  - AC-5: Given one normalised name mapping to more than one employee, then an `AMBIGUOUS_NAME` error.
- Definition of Done: Standard.
- Dependencies: E-02-03, E-00-03
- Notes: Pure domain diff; the loader is in the application layer.

**E-02-05 — Import preview screen**
- As an HR Admin, I want a clear preview before anything is saved, so that I can catch mistakes in the sheet first.
- Story Points: 5 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given an uploaded file, when the preview loads, then I see the sheet used, the sprint range, summary counts, and tabs for New employees, Changes, Scores, Warnings and Errors.
  - AC-2: Given near-duplicates, then each has a "Same person" checkbox, and unchecked ones are labelled "will be created as new".
  - AC-3: Given errors, then "Confirm import" is disabled and the errors list their row and column; given only warnings, then it is enabled.
  - AC-4: Given I click "Discard", then the batch is DISCARDED and I return to the upload step; previews older than 30 minutes show "expired, upload again".
  - AC-5: Given the same file hash as the last committed batch, then a notice says "This file was already imported on <date>".
- Definition of Done: Standard + Playwright upload → preview test.
- Dependencies: E-02-04, E-00-05
- Notes: `POST /api/v1/imports` and `DELETE /imports/{id}`.

**E-02-06 — Data-quality warnings**
- As an HR Admin, I want sheet formula errors flagged, so that I can fix the source spreadsheet.
- Story Points: 3 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given a row whose sheet Average differs from the recalculated average by more than 0.02, then an `AVG_MISMATCH` warning shows the name, sheet value and computed value.
  - AC-2: Given a sheet Total differing by more than 0.05, then a `TOTAL_MISMATCH` warning.
  - AC-3: Given the unmodified sample workbook, then there are 0 AVG/TOTAL mismatches (its formulas are consistent); a fixture with one edited Average produces exactly one warning.
- Definition of Done: Standard.
- Dependencies: E-02-03, E-04-01
- Notes: The warnings feed the dashboard banner (E-05-06).

**E-02-07 — Atomic commit with revision guard & journal**
- As an HR Admin, I want confirming an import to apply all changes at once, or none, so that the data is never half-updated.
- Story Points: 5 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given a preview whose `baseRevision` equals the current `scoreRevision`, when I confirm, then employees, aliases, teams, designations, sprints and scores are written in one transaction, every mutation has an `ImportChange` journal row, and the batch becomes COMMITTED with `commitRevision = base + 1`.
  - AC-2: Given data changed since the preview (the revision moved), then 409 `CONFLICT_STALE_PREVIEW` and nothing is written.
  - AC-3: Given a failure injected mid-transaction, then the database is identical to before (verified by row counts and checksums).
  - AC-4: Given a locked employee field, then it is not overwritten; given `importNotScoredOverwrites=true`, then a file N/A clears a stored score.
  - AC-5: Given the sample workbook into an empty DB, then 49 employees, 8 teams, 4 designations, 17 sprints and 560 scored cells exist.
- Definition of Done: Standard + `IMPORT_COMMIT` audit row.
- Dependencies: E-02-04, E-02-05
- Notes: The conditional increment is the first statement (ADR-007).

**E-02-08 — Roll back latest import**
- As an HR Admin, I want to undo the most recent import, so that I can recover from uploading the wrong file.
- Story Points: 5 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the latest COMMITTED batch and `scoreRevision == commitRevision`, when I roll back and confirm, then every journalled change is reversed (created rows deleted, updated rows restored) and the batch becomes ROLLED_BACK.
  - AC-2: Given a later score or employee edit, merge or erasure, then 409 `CONFLICT_LATER_CHANGES`; a settings change alone does **not** block rollback.
  - AC-3: Given a batch that isn't the latest, then 409 `NOT_LATEST`.
  - AC-4: Import A → import B → rollback B restores the state after A exactly (snapshot comparison).
- Definition of Done: Standard + `IMPORT_ROLLBACK` audit row.
- Dependencies: E-02-07
- Notes: None.

**E-02-09 — Import history & original-file download**
- As an HR Admin, I want to see past imports and download the original files, so that I can trace where the figures came from.
- Story Points: 2 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given past imports, then `/imports` lists date, file name, status, uploader and summary counts, newest first, paginated.
  - AC-2: Given a batch whose original is still retained, then "Download original" returns the exact bytes (hash matches); otherwise the button is disabled with the reason "removed by retention/erasure".
  - AC-3: The rollback button appears only on the batch that can be rolled back.
- Definition of Done: Standard.
- Dependencies: E-02-07
- Notes: None.

### E-05 — KPI Dashboard

**E-05-01 — KPI summary cards**
- As Management, I want headline KPI cards, so that I can judge org health in five seconds.
- Story Points: 3 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the dataset, then cards show: engineers in view, org average, latest-sprint average with participants, latest coverage %, and count and % per band.
  - AC-2: Given values, then each card's accent follows its band and also carries a text label (not colour alone).
  - AC-3: Given the workbook fixture with no filters, then org average, latest sprint (S138) average 8.41 and coverage 95.9% are displayed.
- Definition of Done: Standard.
- Dependencies: E-04-05, E-00-05
- Notes: None.

**E-05-02 — Filters with bookmarkable state**
- As an HR Admin, I want to filter by designation, team, rating, coverage, sprint range, status and name, so that I can focus on one segment.
- Story Points: 3 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given several filters, then they combine with AND, and cards, charts and table update together in ≤ 300 ms.
  - AC-2: Given a filter change, then the URL query updates; reloading or sharing that URL restores the same view.
  - AC-3: Given "Reset", then all filters return to their defaults.
  - AC-4: Given a sprint range change, then the dataset is re-fetched (E-04-06); other filters run client-side only.
- Definition of Done: Standard + Playwright filter test.
- Dependencies: E-05-01
- Notes: The sprint-range control is hidden until E-04-06 ships.

**E-05-03 — Group & trend charts**
- As Management, I want charts of average by designation, average by team, rating distribution and org average per sprint, so that I can compare groups and spot trends.
- Story Points: 5 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given filtered data, then the designation and team bar charts use a 0–10 scale, their tooltips show headcount, and the order is Team Lead, SSE, SE, ASE, then by sort order.
  - AC-2: Given the trend chart, then sprints with no scores show as gaps and tooltips show participants.
  - AC-3: Each chart has an accessible visually hidden data table and an `aria-describedby` summary.
  - AC-4: Given the fixture, then the chart data equals the E-04-04 outputs.
- Definition of Done: Standard.
- Dependencies: E-05-01, E-04-04
- Notes: Chart.js is registered tree-shaken; charts load client-only.

**E-05-04 — Momentum "biggest movers" chart**
- As Management, I want to see who is improving or declining fastest, so that I can recognise or support people in time.
- Story Points: 3 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given more than 14 eligible engineers, then the top 7 risers and bottom 7 decliners are shown; given 14 or fewer, then all are shown.
  - AC-2: Given a bar, then it is green and labelled "+x.xx" when ≥ 0, red and "−x.xx" when < 0, and the tooltip shows "prior 3 → last 3".
  - AC-3: Given no eligible engineers, then an explanatory empty state is shown.
- Definition of Done: Standard.
- Dependencies: E-05-03
- Notes: Eligibility is `momentumMinSprints` (6).

**E-05-05 — Sortable engineer table**
- As an HR Admin, I want a sortable table of every engineer, so that I can scan and compare individuals.
- Story Points: 3 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the table, then the columns are Rank (overall), Name, Team, Designation, Sprints, Total, Avg, Last 3, Momentum, Rating.
  - AC-2: Given a header click, then the sort toggles; nulls always sort last; text columns default ascending and numbers descending; `aria-sort` is set.
  - AC-3: Given keyboard focus on a row, when I press Enter, then the engineer profile opens (E-06-01).
  - AC-4: Given two adjacent rows with equal 2-dp averages but different ranks, then the average's tooltip shows 3 dp.
- Definition of Done: Standard.
- Dependencies: E-05-01
- Notes: None.

**E-05-06 — Data-check banner & empty state**
- As an HR Admin, I want to know when data is suspect or missing, so that I don't present wrong figures.
- Story Points: 2 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the latest committed import has warnings, then a dismissible banner shows the count and the first 3 items, with a link to the import detail.
  - AC-2: Given no committed import, then the dashboard shows an "Upload your KPI master sheet" call to action linking to `/imports`.
  - AC-3: The header line shows the sprint range, engineer count, last import time (Asia/Kathmandu) and the band legend.
- Definition of Done: Standard.
- Dependencies: E-05-01, E-02-06
- Notes: None.

### E-06 — Engineer Profile & Rankings

**E-06-01 — Engineer profile modal**
- As Management, I want an engineer's sprint-by-sprint trend against the org average, so that I can prepare for their appraisal conversation.
- Story Points: 3 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given a row click, then a modal shows name, designation, team, "overall rank X of N", designation rank, average, total, sprints, rating, last 3, momentum, best/worst, variability and RUN count.
  - AC-2: Given the chart, then the engineer line has gaps for RUN and N/A, and a dashed org-average line is shown.
  - AC-3: The modal traps focus, closes on Esc or the close button, and returns focus to the originating row.
- Definition of Done: Standard + axe check.
- Dependencies: E-05-05, E-04-03
- Notes: Uses `GET /api/v1/employees/{id}/profile`.

**E-06-02 — Profile page & score table**
- As Management, I want a direct link to an engineer's profile with every sprint score, so that I can bookmark it and review the detail.
- Story Points: 3 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given `/employees/[id]`, then the profile content from E-06-01 renders as a full page.
  - AC-2: Given the score table, then each sprint shows its value, "RUN" or "N/A", and the import batch that last wrote it.
  - AC-3: Given an unknown ID, then a 404 page is shown.
- Definition of Done: Standard.
- Dependencies: E-06-01
- Notes: None.

**E-06-03 — Rankings page**
- As Management, I want overall, per-designation and last-N rankings, so that I no longer need the ranking blocks in Excel.
- Story Points: 5 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the Overall tab, then all ranked engineers appear in the E-04-03 order, and ranks match the workbook fixture 100%.
  - AC-2: Given the By-designation tab, then there is one table per designation with ranks restarting at 1.
  - AC-3: Given the Last-N tab, then the window label (e.g. "S133–S138") is shown and averages match Sheet1.
  - AC-4: Given engineers below the eligibility threshold, then they appear in a separate "Not yet eligible" list.
- Definition of Done: Standard.
- Dependencies: E-04-03, E-00-05
- Notes: Uses `GET /api/v1/kpi/rankings`.

**E-06-04 — Team & designation summaries with Top-N**
- As Management, I want team and designation summary tables and a Top-N list, so that I can compare groups numerically, as in Performance Insights.
- Story Points: 3 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the summaries view, then the team table shows people, score observations, total, weighted average and rank, and the designation table shows people, observations and weighted average.
  - AC-2: Given Top-N, then the top 10 engineers with ≥ 5 sprints are listed (matching Performance Insights rows 21–30).
  - AC-3: Given the headline, then resources, overall average, latest sprint, latest average and coverage are shown.
- Definition of Done: Standard.
- Dependencies: E-04-04, E-06-03
- Notes: Uses `GET /api/v1/kpi/summaries`.

**E-06-05 — Auto-generated interpretation**
- As Management, I want a one-paragraph plain-English interpretation, so that I get the key takeaways without reading tables.
- Story Points: 2 — Priority: P3 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the fixture, then the text names the top established performer (Niba Tandukar, 9.53 over 10 sprints), the #1 by raw average with their sprint count, the leading team (DevOps, 8.97) and the latest sprint average with coverage.
  - AC-2: Given no data, then the paragraph is hidden.
- Definition of Done: Standard.
- Dependencies: E-06-04
- Notes: Template-based (no AI generation).

### E-07 — Reports & Export

**E-07-01 — Print dashboard to PDF**
- As Management, I want to print or save the dashboard as a PDF, so that I can circulate it in meetings.
- Story Points: 3 — Priority: P1 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given "Export / Print", then `/print/dashboard?<current filters>` opens, the browser print dialog is triggered, and navigation and filters are hidden.
  - AC-2: Given A4 portrait or landscape, then no panel or chart splits across pages, and every page has a header (filters, range, generated time) and the footer "Cloudtech Services · Confidential".
  - AC-3: Given grayscale printing, then bands remain distinguishable by their text labels.
- Definition of Done: Standard + manual print check recorded with a screenshot.
- Dependencies: E-05-03, E-05-05
- Notes: ADR-012.

**E-07-02 — Export engineer table to Excel/CSV**
- As an HR Admin, I want to export the filtered table, so that I can analyse it further in Excel.
- Story Points: 3 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given current filters, then the `.xlsx` contains exactly the visible rows and columns plus one column per sprint in range (`RUN` and `N/A` shown as text).
  - AC-2: Given a cell value starting with `=`, `+`, `-`, `@`, a tab or a carriage return, then it is escaped (prefixed with `'`).
  - AC-3: The filename is `cloudtech-kpi_<from>-<to>_<yyyymmdd>.xlsx`; `format=csv` returns UTF-8 CSV with a BOM.
- Definition of Done: Standard.
- Dependencies: E-05-05
- Notes: None.

**E-07-03 — Export rankings workbook**
- As Management, I want rankings as a workbook, so that I can attach them to appraisal records.
- Story Points: 2 — Priority: P3 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given an export, then the workbook has sheets Overall, By designation and Last N, matching the Rankings page.
  - AC-2: Injection escaping is applied, as in E-07-02.
- Definition of Done: Standard.
- Dependencies: E-06-03, E-07-02
- Notes: None.

**E-07-04 — Individual appraisal summary print**
- As Management, I want a one-page appraisal summary per engineer, so that I can hand it over during a review.
- Story Points: 3 — Priority: P3 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given `/print/employees/[id]`, then one A4 page shows profile stats, the trend chart, overall and designation rank, rating and sprint range.
  - AC-2: The page carries the confidential footer and the generated time.
- Definition of Done: Standard.
- Dependencies: E-06-02, E-07-01
- Notes: None.

**E-07-05 — Team batch appraisal print**
- As Management, I want all appraisal summaries for a team in one print job, so that I can prepare a team's reviews at once.
- Story Points: 2 — Priority: P4 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given `/print/teams/[id]`, then each engineer's summary starts on a new page.
  - AC-2: Given a team with 0 engineers, then a "No engineers" page is shown.
- Definition of Done: Standard.
- Dependencies: E-07-04
- Notes: None.

### E-03 — Employee, Team & Sprint Master Data

**E-03-01 — Employee list**
- As an HR Admin, I want a searchable employee list, so that I can see who is tracked and find a record quickly.
- Story Points: 3 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given `/employees`, then I see name, code, team, designation, status and sprints scored.
  - AC-2: Given search text and team, designation or status filters, then the list narrows accordingly.
  - AC-3: Given more than 200 rows, then the list paginates with a cursor.
- Definition of Done: Standard.
- Dependencies: E-02-07
- Notes: None.

**E-03-02 — Edit employee with aliases & field locks**
- As an HR Admin, I want to correct an employee's details, so that records stay accurate and my corrections survive future imports.
- Story Points: 5 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given I change the display name, then the old normalised name stays an alias, and re-importing with the old spelling still matches this employee.
  - AC-2: Given I change team or designation, then the corresponding lock is set; a later import with a different value doesn't overwrite it and the preview shows `LOCKED_FIELD_DIFFERS`.
  - AC-3: Given "Unlock", then the next import may update the field again.
  - AC-4: Given setting status to Inactive, then the employee disappears from default dashboard views but appears with "include inactive".
  - AC-5: Every change is audited with before and after values (`EMPLOYEE_UPDATE`).
- Definition of Done: Standard.
- Dependencies: E-03-01
- Notes: A duplicate `employeeCode` returns 409.

**E-03-03 — Teams & designations: rename and order with aliases**
- As an HR Admin, I want to rename and order teams and designations, so that labels are consistent (OQ-03) without breaking imports.
- Story Points: 3 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given I rename "Run Team" to "RUN", then a later import containing "Run Team" maps to the same team (no duplicate created).
  - AC-2: Given a sort order change, then charts and filters use the new order.
  - AC-3: Given a team that is in use, then deletion is not offered.
- Definition of Done: Standard.
- Dependencies: E-02-07
- Notes: ADR-018.

**E-03-04 — Merge employees**
- As an HR Admin, I want to merge a duplicate employee into the correct one, so that a misspelt import doesn't split someone's history.
- Story Points: 5 — Priority: P3 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given source B and target A, when I merge with `keepTarget`, then B's scores move to A except where A already has a score for that sprint, B's aliases move to A, and B is deleted.
  - AC-2: Given `keepSource`, then B's conflicting scores replace A's.
  - AC-3: Given A = B, then 400 `SAME_EMPLOYEE`; the merge is audited and bumps `scoreRevision`.
- Definition of Done: Standard.
- Dependencies: E-03-02
- Notes: None.

**E-03-05 — Correct a single score**
- As an HR Admin, I want to fix one wrong score with a reason, so that I don't need to re-import the whole sheet.
- Story Points: 3 — Priority: P3 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given a valid cell (score 0–10, RUN or N/A) and a reason of 3–500 characters, then the score updates and `SCORE_CORRECT` is audited with before and after.
  - AC-2: Given an out-of-range value, then 422 `OUT_OF_RANGE`.
  - AC-3: Given a correction, then rollback of earlier imports is blocked (the revision moved).
- Definition of Done: Standard.
- Dependencies: E-06-02
- Notes: Edited inline in the profile page score table.

**E-03-06 — Privacy erasure**
- As an HR Admin, I want to permanently erase a person's data on request, so that we comply with the Nepal Individual Privacy Act 2075.
- Story Points: 5 — Priority: P3 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given I type the employee's exact name to confirm, then the employee, scores and aliases are deleted, and journal, issue and audit payloads referencing them are redacted to `"[erased]"`.
  - AC-2: Given erasure, then all stored upload originals are deleted (the dialog states how many) and earlier batches can no longer be rolled back.
  - AC-3: An integration test searches every table and `DATA_DIR/uploads` for the erased name and finds 0 occurrences; the `EMPLOYEE_ERASE` audit row contains only the former ID.
- Definition of Done: Standard.
- Dependencies: E-03-02, E-09-01
- Notes: ADR-017.

**E-03-07 — Sprint dates**
- As an HR Admin, I want to record each sprint's start and end dates, so that reports can show calendar periods.
- Story Points: 1 — Priority: P4 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given a sprint, then I can set or clear its start and end dates, with end ≥ start validated.
  - AC-2: Given dates, then sprint tooltips on charts show "S138 · 06 Oct – 17 Oct 2026".
- Definition of Done: Standard.
- Dependencies: E-02-07
- Notes: None.

### E-08 — Settings & Configuration

**E-08-01 — Settings storage & validation API**
- As an HR Admin, I want KPI policy stored and validated centrally, so that every view uses the same rules.
- Story Points: 3 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given `GET /api/v1/settings`, then the stored settings merged over the domain defaults (ADR-015 table) are returned.
  - AC-2: Given `PUT` with invalid values (bands not descending, `lastNWindow` outside 1–20, negative tolerances), then 400 with field errors.
  - AC-3: Given a valid `PUT`, then `settingsRevision` increments and `SETTINGS_UPDATE` is audited with before and after.
- Definition of Done: Standard.
- Dependencies: E-04-02, E-00-04
- Notes: None.

**E-08-02 — Rating bands editor**
- As an HR Admin, I want to edit band thresholds and labels, so that a policy change doesn't need a developer.
- Story Points: 2 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given the Settings page, then I can edit each band's label and minimum, with inline validation errors.
  - AC-2: Given I save, then a preview line shows how many engineers change band before I confirm.
- Definition of Done: Standard.
- Dependencies: E-08-01
- Notes: None.

**E-08-03 — Calculation parameters editor**
- As an HR Admin, I want to set the last-N window, minimum sprints, Top-N size, ranking scope, tolerances and import overwrite policy, so that open policy questions (OQ-04…07) can be answered in the app.
- Story Points: 2 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given each parameter, then the field shows its default and help text explaining its effect.
  - AC-2: Given I save valid values, then they persist; given invalid values, then the save is blocked.
- Definition of Done: Standard.
- Dependencies: E-08-01
- Notes: None.

**E-08-04 — Settings-driven recalculation**
- As Management, I want views to reflect new settings immediately, so that I never see figures computed with old rules.
- Story Points: 2 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given a settings change, then the next dataset request returns a new ETag and the recomputed bands and ranks, with no re-import.
  - AC-2: Given a settings change after an import, then that import can still be rolled back.
- Definition of Done: Standard.
- Dependencies: E-08-01, E-04-05
- Notes: None.

**E-08-05 — Reset settings to defaults**
- As an HR Admin, I want to restore the default settings, so that I can recover from a bad configuration.
- Story Points: 1 — Priority: P3 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given "Reset to defaults" and a confirmation, then the settings equal the ADR-015 defaults, and the change is audited.
  - AC-2: Given I cancel, then nothing changes.
- Definition of Done: Standard.
- Dependencies: E-08-01
- Notes: None.

### E-09 — Audit & Data Governance

**E-09-01 — Audit event recording**
- As Management, I want every sensitive action recorded, so that changes to performance data are accountable.
- Story Points: 3 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given each action in the architecture's AuditEvent list, then exactly one row is written with time, actor, action, entity and before/after.
  - AC-2: Given audit payloads, then they never contain passwords, tokens or full score matrices (asserted by a test).
  - AC-3: The `AuditLog` port replaces any interim direct writes from E-01-01.
- Definition of Done: Standard.
- Dependencies: E-00-04
- Notes: None.

**E-09-02 — Audit log viewer**
- As Management, I want to browse the audit trail, so that I can check who changed what and when.
- Story Points: 3 — Priority: P3 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given `/audit`, then events show newest first, filterable by date range and action, with cursor pagination.
  - AC-2: Given an event, then expanding it shows a before/after diff.
  - AC-3: Times display in Asia/Kathmandu; the view is read-only.
- Definition of Done: Standard.
- Dependencies: E-09-01
- Notes: None.

**E-09-03 — Backup download**
- As an HR Admin, I want to download a backup, so that the data survives a disk failure or a move to a server.
- Story Points: 2 — Priority: P2 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given "Download backup", then a zip `hrm-backup_<yyyymmdd-HHmm>.zip` containing a consistent DB snapshot (`VACUUM INTO`) and `uploads/` streams to the browser.
  - AC-2: Given a backup taken during an import, then the snapshot is transactionally consistent.
  - AC-3: `BACKUP_CREATE` is audited.
- Definition of Done: Standard.
- Dependencies: E-00-03, E-01-02
- Notes: None.

**E-09-04 — Restore procedure & verification test**
- As an HR Admin, I want a documented, tested restore, so that a backup is actually usable.
- Story Points: 2 — Priority: P3 — Labels: chore
- Acceptance Criteria:
  - AC-1: The README documents the steps: stop the app → unzip into `DATA_DIR` → `prisma migrate deploy` → start.
  - AC-2: An integration test restores a backup into a temporary `DATA_DIR`, and the row counts per table equal the source.
- Definition of Done: Standard.
- Dependencies: E-09-03
- Notes: None.

**E-09-05 — Upload retention purge**
- As an HR Admin, I want old uploaded files purged automatically, so that we don't keep personal data longer than needed.
- Story Points: 2 — Priority: P3 — Labels: feature
- Acceptance Criteria:
  - AC-1: Given uploads older than `uploadRetentionDays` (default 90), when the next upload happens, then those files are deleted and their batches keep only summary metadata.
  - AC-2: Given a purged batch, then "Download original" is disabled with the reason.
- Definition of Done: Standard.
- Dependencies: E-02-09, E-08-01
- Notes: The retention period is pending OQ-11.

---

## Sprint-Ready Stories

All stories below are ≤ 5 points, have complete acceptance criteria, and depend only on stories ranked above them.

| Rank | Story ID | Title | Points | Epic | Sprint |
|---|---|---|---|---|---|
| 1 | E-00-01 | Toolchain verification spike | 1 | E-00 | 1 |
| 2 | E-00-02 | Project scaffold & quality gates | 5 | E-00 | 1 |
| 3 | E-00-03 | Database schema & migrations | 5 | E-00 | 1 |
| 4 | E-00-04 | Composition root, env & HTTP plumbing | 3 | E-00 | 1 |
| 5 | E-00-06 | Golden test fixtures | 3 | E-00 | 1 |
| 6 | E-00-05 | App shell, design tokens & security headers | 3 | E-00 | 1 |
| 7 | E-01-01 | Login with lockout | 5 | E-01 | 1 |
| 8 | E-01-02 | Two-gate route protection | 3 | E-01 | 1 |
| 9 | E-01-03 | Seed first HR Admin | 2 | E-01 | 1 |
| 10 | E-01-04 | Session expiry & logout | 2 | E-01 | 1 |
| 11 | E-04-01 | Per-engineer metrics | 5 | E-04 | 1 |
| 12 | E-04-02 | Rating bands | 2 | E-04 | 1 |
| 13 | E-04-03 | Rankings with exact-precision comparison | 5 | E-04 | 1 |
| 14 | E-04-04 | Group aggregates & sprint trend | 3 | E-04 | 1 |
| 15 | E-02-01 | Secure upload & original-file storage | 3 | E-02 | 1 |
| 16 | E-02-02 | Sheet & header detection | 5 | E-02 | 2 |
| 17 | E-02-03 | Cell parsing & row validation | 5 | E-02 | 2 |
| 18 | E-02-04 | Identity matching & diff engine | 5 | E-02 | 2 |
| 19 | E-02-05 | Import preview screen | 5 | E-02 | 2 |
| 20 | E-02-06 | Data-quality warnings | 3 | E-02 | 2 |

**Sprint 1 (2026-10-19 → 2026-10-30) Goal:** An HR Admin can log in to a secured, branded app whose KPI engine provably reproduces the master sheet's numbers (all golden tests green), with safe file upload in place.

**Sprint 1 Commitment:** ranks 1–15: E-00-01, E-00-02, E-00-03, E-00-04, E-00-06, E-00-05, E-01-01, E-01-02, E-01-03, E-01-04, E-04-01, E-04-02, E-04-03, E-04-04, E-02-01, a total of **50 points** at the stated assumption of **50 points per sprint** (one developer, AI-assisted). Stretch goal if ahead: E-02-02.

**Sprint 2 (2026-11-02 → 2026-11-13), MVP demo:** E-02-02…07 (28) + E-04-05 (5) + E-05-01, E-05-02, E-05-03, E-05-05, E-05-06 (16) = **49 points**. Goal: upload the real master sheet and use the live dashboard.

**Sprint 3 (2026-11-16 → 2026-11-27), v1.0 release:** the remaining P1 (E-05-04, E-06-01, E-06-03, E-07-01 = 14) + P2 (E-02-08, E-02-09, E-01-05, E-03-01, E-03-02, E-03-03, E-04-06, E-06-02, E-07-02, E-09-01, E-09-03 = 34) = **48 points**.

**Sprint 4 (2026-11-30 → 2026-12-11), v1.1:** the remaining P2 (E-04-07, E-06-04, E-08-01…04 = 14) + P3/P4 (31) = **45 points**.

---

## Backlog Metrics

| Metric | Value |
|---|---|
| Total Epics | 10 (9 from requirements + E-00 Foundation) |
| Total Stories | 60 |
| Total Story Points | 192 |
| Must-Have Points (P1+P2) | 161 (P1 113 · P2 48) |
| P3 / P4 Points | 28 / 3 |
| Average Story Size | 3.2 pts |
| Stories needing splitting (>8 pts) | 0 (largest: 5 pts) |
| Estimated Sprints at 50 pts velocity | 3.9 (P1+P2: 3.2) |
| Estimated Calendar Months | about 2 (2026-10-19 → 2026-12-11) |

---

## Backlog Health Notes

1. **The timeline is over-committed for the original 13 November date.** P1 alone is 113 points, which is 2.3 sprints even at an optimistic AI-assisted 50 points per sprint. The plan above moves v1.0 to **27 November** and keeps 13 November as the MVP demo. If Sprint 1's actual velocity comes in under 40, the next cut is to move E-06-03 (rankings page) and E-07-01 (print) into the v1.1 sprint.
2. **E-08 Settings is a thin epic** (10 points across 5 small stories). That is deliberate: the domain defaults (ADR-015) let the whole product run with no settings UI, so E-08 is safe to slip. Its stories could be merged into two during grooming.
3. **E-02 Import is the riskiest epic** (38 points, 6 of 9 stories at 5 points). The diff engine (E-02-04) and the atomic commit (E-02-07) carry most of the complexity. They are on the Sprint 2 critical path to the MVP demo, so start them early in the sprint.
4. **Hidden cross-cutting dependency: audit.** E-01-01, E-02-07 and others write audit rows before E-09-01 (Sprint 3) formalises the port. E-00-04 should therefore include a minimal `AuditLog` interface and adapter so later stories don't need rework. This is flagged in the E-01-01 and E-09-01 notes.
5. **The open questions affect acceptance criteria, not structure.** OQ-01 (employee code), OQ-03 (canonical teams), OQ-04/05 (ranking scope and eligibility) and OQ-07 (overwrite policy) all have settings or alias-based answers. Wrong defaults would mean re-running golden expectations, not rework.
6. **Spike coverage.** Only one spike (E-00-01) exists. The other unknown, print fidelity of Chart.js canvases (E-07-01), is low-risk but should get a 1-hour check during Sprint 2.

**Recommendations before Sprint 1:**
1. **Confirm the re-baselined dates** (MVP demo 13 Nov, v1.0 27 Nov, v1.1 11 Dec), or choose a scope cut to keep v1.0 on 13 November.
2. **Fold a minimal `AuditLog` port into E-00-04** (no extra points) to avoid rework in E-01 and E-02.
3. **Get HR answers to OQ-01, OQ-03 and OQ-08 by 23 October**, before the import stories start in Sprint 2.
4. **Initialise a git repository and keep it private.** The golden fixtures contain real employee names and scores.
5. **Track Sprint 1's actual velocity** at mid-sprint (23 October) and re-plan Sprints 2–4 if it is below 40 points.

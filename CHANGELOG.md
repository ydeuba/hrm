# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Platform foundation (E-00):**
  - Next.js 16 + TypeScript 6 scaffold with clean-architecture layer rules enforced by lint.
  - Prisma 7 + SQLite schema for the full data model, with WAL mode and foreign keys.
  - Zod-validated environment that fails fast on start-up.
  - Uniform API error envelope, structured logging, CSRF Origin check, `/api/health`.
  - Golden test fixtures generated from the KPI master sheet and the reference HTML report.
- **App shell (E-00-05):** branded header and navigation (responsive and keyboard-operable); per-request nonce Content-Security-Policy; HSTS over HTTPS; security headers.
- **HR Admin authentication (E-01-01…04):**
  - email + password sign-in (argon2id);
  - database-backed sessions with 60-minute idle and 12-hour absolute expiry;
  - 15-minute lockout after 5 failed attempts;
  - two-gate route protection;
  - logout;
  - `npm run seed:admin` to create the first admin;
  - audit events for every sign-in, failure, lockout and logout.

- **KPI calculation engine (E-04-01…04):**
  - pure, dependency-free metrics (total, exact and 2-dp average, last 3 / prior 3 / momentum, best, worst, variability, band);
  - competition rankings on exact averages, matching the master sheet for all 49 engineers;
  - last-N window rankings;
  - weighted team and designation summaries;
  - sprint trend with coverage.
  All of it is verified against the KPI master sheet and the reference report.
- **Secure KPI sheet upload (E-02-01):** `POST /api/v1/imports` accepts `.xlsx`/`.csv` up to 5 MB, rejects macro-enabled, encrypted, legacy and zip-bomb files with specific reasons, and stores the original under `DATA_DIR/uploads/<sha256>`.

- **KPI master sheet import (E-02):**
  - finds the "Compile Sheet" and its header row automatically;
  - parses RUN/N/A cells and half-up rounding, with row-level errors and warnings;
  - matches employees, teams and designations by remembered alternative names, flags near-duplicates, and respects HR field locks;
  - a review screen (tabs for new employees, changes, scores, warnings and errors) before anything is written;
  - an atomic commit with a revision guard and a change journal;
  - a data check of the sheet's Total/Average columns against recalculated values.
- **KPI dashboard (E-05):** parity with the reference report.
  - Contents: headline cards; designation, team, rating and trend charts with "Show as table"; a momentum "biggest movers" chart; a sortable engineer table with 3-dp tie tooltips; a data-check banner; an empty state; print.
  - Filters: bookmarkable in the URL, plus a sprint-range selector.
- **Engineer profile dialog (E-06-01):** stats and a sprint trend against the org average; keyboard accessible.
- **Dashboard dataset API (E-04-05):** `GET /api/v1/kpi/dataset` with ETag/304; 500 engineers × 200 sprints served at p95 313 ms.
- **Design system:** design spec (`aaid_artifacts/planning/design/design.md`) and AA-safe colour tokens.
- **Import history and rollback:** history list, download of the original file, and rollback of the latest import (restores the previous scores from the change journal).
- **Rankings (E-06):** Overall, By designation, Last N sprints and Summaries (team/designation tables, top performers, interpretation); engineer profile page.
- **Employees and labels (E-03):** list, edit with team/designation locks, and renaming of teams and designations with alias history.
- **Settings (E-08):** editors for rating bands (with a live "engineers would change band" preview) and calculation parameters; reset to defaults; changes recompute without a re-import and are audited.
- **Exports (E-07-02, E-07-03):** the filtered engineer table as `.xlsx`/CSV (`cloudtech-kpi_<from>-<to>_<yyyymmdd>`) and a rankings workbook, both with formula-injection escaping.
- **Print (E-07-01):** `/print/dashboard` A4 print view with a repeating header (filters, range, generated time) and a confidential footer.
- **Backup (E-09-03, E-09-04):** "Download backup" zip containing a `VACUUM INTO` snapshot plus uploads (audited); restore steps documented and verified by a test.
- **Performance benchmarks (E-04-07):** `npm run test:perf` covers `computeDashboard` (p95 40 ms), import preview of a 4.7 MB workbook (0.8 s) and the dataset API (p95 184–350 ms).
- **Appraisal prints (E-07-04, E-07-05):** a one-page A4 summary per engineer (`/print/employees/[id]`) and team batches (`/print/teams/[id]`), one engineer per page.
- **Audit log viewer (E-09-02):** `/audit`, newest first, with date (Asia/Kathmandu) and action filters, cursor pages and field-level before/after diffs.
- **Data corrections (E-03-04, E-03-05):** merge a duplicate employee (keep target or keep source on conflicts) and correct a single score inline with a mandatory reason; both are audited.
- **Privacy erasure (E-03-06):** permanently delete a person after typed-name confirmation. Every reference in journals, issues, batch summaries and the audit log is redacted, and stored originals are deleted (ADR-017).
- **Sprint dates (E-03-07):** set or clear sprint start/end dates in Settings; chart tooltips show the calendar period.
- **Upload retention (E-09-05):** originals older than `uploadRetentionDays` are purged on the next upload, and the history shows why a download is unavailable.

### Fixed
- Several confirmation dialogs on one page shared a title id, so screen readers announced the wrong dialog name.
- Unit/integration runs timed out under load; workers are now capped at 50% and the hook timeout raised.

### Security
- Pinned toolchain with `npm audit` clean (0 vulnerabilities). npm `overrides` patch vulnerable transitive dependencies of the Prisma CLI, and SheetJS is installed from the official CDN rather than the vulnerable npm package.

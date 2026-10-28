# Requirements — hrm (Cloudtech HRM & Engineering KPI Dashboard)

**Version:** 1.0 (draft) · **Date:** 2026-10-15 · **Owner:** HR (product owner), Management (sponsor)
**Stack constraint:** Single Next.js (TypeScript) application — UI and backend (Route Handlers / Server Actions) in one project folder. Runs locally for v1; deployable to a server later without code changes.
**Reference inputs:** `Cloudtech_KPI_Dashboard_S122-S135.html` (target dashboard UX), `KPI Master Sheet (2).xlsx` (source data format).

---

## Executive Summary

Cloudtech's engineering performance is currently tracked in a hand-maintained Excel master sheet that stitches together per-team workbooks, recomputes averages and rankings with fragile formulas, and is then re-packaged into a static HTML report each sprint. **hrm** replaces that loop with a secure, single-login web application where HR uploads the KPI master sheet, the system validates and stores every sprint score, and an interactive dashboard instantly shows org, team, designation and individual performance — including trends, momentum and rankings. It gives Management one trusted source of truth for sprint reviews and appraisals, cuts report preparation from hours to minutes, and establishes the employee data foundation for future HRM modules. With 49 engineers across 8 teams and a growing sprint history (S122–S138+), the spreadsheet approach has reached its accuracy and effort limits now.

---

## Epics

- **E-01**: HR Admin Authentication & Access — Secure single-role login for HR Admin(s) with session management, password change and protected routes/APIs. No public or employee access in v1. — Priority: **Must** — Complexity: **S**
- **E-02**: Excel KPI Import & Validation — Upload the KPI Master Sheet (.xlsx, plus .csv fallback), auto-detect the Compile Sheet and header row, parse scores/RUN/N/A, validate, show a preview/diff with data-quality warnings, then commit. Every import is versioned and reversible. — Priority: **Must** — Complexity: **L**
- **E-03**: Employee, Team & Sprint Master Data — Persist employees, teams, designations and sprints derived from imports, with light HR editing (correct names, team, designation, status, merge duplicates). — Priority: **Must** — Complexity: **M**
- **E-04**: KPI Calculation Engine — Server-side, unit-tested implementation of all business rules: averages, totals, weighted team/designation averages, rating bands, momentum, last-N window, rankings with tie-breaks and eligibility thresholds. Single source of truth for every number shown. — Priority: **Must** — Complexity: **M**
- **E-05**: KPI Dashboard — Interactive org dashboard matching (and extending) the reference HTML: filters, KPI cards, charts by designation/team/rating/sprint trend, momentum movers, sortable engineer table. — Priority: **Must** — Complexity: **L**
- **E-06**: Engineer Profile & Rankings — Per-engineer drill-down (sprint trend vs org average, stats) plus overall, per-designation, last-N and Top-N ranking views. — Priority: **Must** — Complexity: **M**
- **E-07**: Reports & Export — Print-optimised PDF of the dashboard and individual profiles; Excel/CSV export of the computed table and rankings for a selected sprint range. — Priority: **Should** — Complexity: **M**
- **E-08**: Settings & Configuration — HR-editable rating bands, last-N window size, minimum sprints for rankings/momentum, data-check tolerance, team and designation ordering. — Priority: **Should** — Complexity: **S**
- **E-09**: Audit & Data Governance — Audit log of logins, imports, rollbacks and manual edits; backup/restore of the local database. — Priority: **Should** — Complexity: **S**

---

## User Stories

### E-01 — HR Admin Authentication & Access

**US-01-01** *(epic E-01)*
- **As an** HR Admin, **I want** to sign in with my email and password, **so that** only authorised HR staff can view employee performance data.
- **Acceptance Criteria**:
  - AC-1: Given a valid email/password, when I submit the login form, then I am redirected to the dashboard and an httpOnly, Secure (in production), SameSite=Lax session cookie is set.
  - AC-2: Given invalid credentials, when I submit, then I see the generic message "Invalid email or password" (no hint which field was wrong) and no session is created.
  - AC-3: Given 5 failed attempts for the same email within 15 minutes, when I try again, then login is blocked for 15 minutes and the event is recorded in the audit log.
  - AC-4: Given I am not signed in, when I request any page or API other than `/login`, then pages redirect to `/login` and APIs return HTTP 401.
- **Story Points**: 5 — **Priority**: Must

**US-01-02** *(epic E-01)*
- **As an** HR Admin, **I want** my session to expire after inactivity and to be able to log out, **so that** an unattended machine does not expose data.
- **Acceptance Criteria**:
  - AC-1: Given no activity for 60 minutes (configurable), when I next interact, then I am redirected to `/login`.
  - AC-2: Given I click "Log out", then the session is invalidated server-side and the cookie is cleared; the back button does not reveal dashboard data.
  - AC-3: Absolute session lifetime is 12 hours regardless of activity.
- **Story Points**: 2 — **Priority**: Must

**US-01-03** *(epic E-01)*
- **As the** system installer, **I want** the first HR Admin account to be created via a seed command using environment variables, **so that** no default password ships with the app.
- **Acceptance Criteria**:
  - AC-1: Given `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars, when I run the seed command, then one HR Admin is created with a bcrypt/argon2 hashed password.
  - AC-2: Given the env vars are missing, then the seed fails with a clear message and no account is created.
  - AC-3: Given an admin already exists, re-running the seed does not create a duplicate or overwrite the password.
- **Story Points**: 2 — **Priority**: Must

**US-01-04** *(epic E-01)*
- **As an** HR Admin, **I want** to change my password, **so that** I can rotate credentials.
- **Acceptance Criteria**:
  - AC-1: Given I enter my current password and a new password of ≥12 characters, when I submit, then the password is updated and all other sessions are invalidated.
  - AC-2: Given the current password is wrong, then the change is rejected.
- **Story Points**: 2 — **Priority**: Should

### E-02 — Excel KPI Import & Validation

**US-02-01** *(epic E-02)*
- **As an** HR Admin, **I want** to upload the KPI Master Sheet `.xlsx`, **so that** the system ingests the latest sprint scores without re-typing.
- **Acceptance Criteria**:
  - AC-1: Given an `.xlsx` (or `.csv`) file ≤ 5 MB, when I upload it, then the system locates the worksheet whose trimmed name is "Compile Sheet" (falls back to the first sheet containing a valid header) and reports which sheet was used.
  - AC-2: The header row is detected within the first 10 rows as the row containing "Designation" and ≥1 column matching `^S\d+$`; columns "Resources", "Teams", "Designation", "Total", "Average" are matched case-insensitively and whitespace-trimmed.
  - AC-3: Cached cell values are read (formulas are never evaluated; external workbook links such as `'[1]Team Bravo'!C6` use their stored value).
  - AC-4: Files with other extensions, >5 MB, password-protected or macro-enabled (`.xlsm`) are rejected with a specific error message.
  - AC-5: Ranking blocks, helper columns and other worksheets (Performance Insights, Sheet1) are ignored — all derived figures are recomputed by E-04.
- **Story Points**: 8 — **Priority**: Must

**US-02-02** *(epic E-02)*
- **As an** HR Admin, **I want** the parser to correctly interpret every cell type, **so that** averages are not distorted.
- **Acceptance Criteria**:
  - AC-1: Numeric values 0–10 are stored with 2-decimal precision.
  - AC-2: `RUN` is stored as status RUN (excluded from calculations, counted as "run sprints"); `N/A`, `NA`, `-`, blank, `#DIV/0!` and other error values are stored as "not scored" and excluded.
  - AC-3: Values outside 0–10 or non-numeric text produce a row-level validation **error** that blocks commit until the file is fixed.
  - AC-4: Section rows (`TEAM LEAD`, `SSE`, `SE`, `ASE`, `QA`, `BA`, `LEAD`) and rows without a name or designation are skipped.
  - AC-5: Sprint columns with no numeric score for anyone (e.g. S139–S141 placeholders) are not created as sprints.
- **Story Points**: 5 — **Priority**: Must

**US-02-03** *(epic E-02)*
- **As an** HR Admin, **I want** a preview of what the import will change before committing, **so that** I can catch mistakes.
- **Acceptance Criteria**:
  - AC-1: Given a parsed file, then the preview shows counts of: new employees, existing employees matched, team/designation changes, new sprints, scores added, scores changed, scores unchanged.
  - AC-2: Employees are matched by normalised name (trimmed, internal whitespace collapsed, case-insensitive), e.g. "Niva  Awale" = "Niva Awale"; possible near-duplicates (edit distance ≤2) are flagged for HR confirmation.
  - AC-3: When I click "Confirm import", the changes are written in a single transaction; on any failure nothing is written.
  - AC-4: When I click "Cancel", nothing is written.
- **Story Points**: 8 — **Priority**: Must

**US-02-04** *(epic E-02)*
- **As an** HR Admin, **I want** data-quality warnings, **so that** I can fix formula errors in the source sheet.
- **Acceptance Criteria**:
  - AC-1: Given a row whose sheet "Average" differs from the recalculated average by more than the tolerance (default 0.02), then a warning lists name, sheet value and recalculated value.
  - AC-2: Same check applies to "Total" (tolerance 0.05).
  - AC-3: Duplicate employee names within one file are reported as errors.
  - AC-4: Warnings do not block commit; they are stored with the import and visible on the dashboard data-check banner until the next import.
- **Story Points**: 3 — **Priority**: Must

**US-02-05** *(epic E-02)*
- **As an** HR Admin, **I want** import semantics that preserve history, **so that** older sprints are not lost when a sheet only contains recent columns.
- **Acceptance Criteria**:
  - AC-1: Scores for sprints present in the file overwrite stored scores for the matched employee/sprint; sprints absent from the file are untouched.
  - AC-2: Employees absent from the file are not deleted; the preview lists them as "not in this file".
  - AC-3: Each import is saved as a versioned batch (who, when, filename, file hash, summary counts).
- **Story Points**: 3 — **Priority**: Must

**US-02-06** *(epic E-02)*
- **As an** HR Admin, **I want** to roll back the most recent import, **so that** I can recover from uploading the wrong file.
- **Acceptance Criteria**:
  - AC-1: Given the latest import batch, when I click "Roll back" and confirm, then all scores and employee changes from that batch revert to their prior values.
  - AC-2: Only the most recent non-rolled-back batch can be rolled back; the action is audit-logged.
- **Story Points**: 5 — **Priority**: Should

### E-03 — Employee, Team & Sprint Master Data

**US-03-01** *(epic E-03)*
- **As an** HR Admin, **I want** an employee list with name, team, designation, status and sprints scored, **so that** I can see who is tracked.
- **Acceptance Criteria**:
  - AC-1: The list is searchable by name and filterable by team, designation and status (Active/Inactive).
  - AC-2: Each employee has a system-generated ID and an optional HR employee code.
- **Story Points**: 3 — **Priority**: Must

**US-03-02** *(epic E-03)*
- **As an** HR Admin, **I want** to edit an employee's display name, team, designation, employee code, email, joining date and status, **so that** records stay accurate between imports.
- **Acceptance Criteria**:
  - AC-1: Given I save valid changes, then they are persisted and audit-logged with old/new values.
  - AC-2: Setting status to Inactive hides the employee from dashboard defaults but keeps their history (a filter can include inactive).
  - AC-3: Name aliases are kept so future imports using the old spelling still match.
- **Story Points**: 3 — **Priority**: Must

**US-03-03** *(epic E-03)*
- **As an** HR Admin, **I want** to merge two employee records, **so that** a misspelt duplicate created by an import is consolidated.
- **Acceptance Criteria**:
  - AC-1: Given records A and B, when I merge B into A, then B's scores move to A (A wins on conflicting sprints after I confirm), B's name becomes an alias of A, and B is removed.
- **Story Points**: 5 — **Priority**: Should

**US-03-04** *(epic E-03)*
- **As an** HR Admin, **I want** to manage teams, designations and sprints, **so that** labels and ordering are correct.
- **Acceptance Criteria**:
  - AC-1: Teams and designations can be renamed and given a display order (default designation order: Team Lead, SSE, SE, ASE).
  - AC-2: Sprints have a code (e.g. S138) and optional start/end dates; sprints sort numerically by code.
  - AC-3: A team/designation in use cannot be deleted.
- **Story Points**: 3 — **Priority**: Should

### E-04 — KPI Calculation Engine

**US-04-01** *(epic E-04)*
- **As** Management, **I want** every individual metric computed by one consistent rule set, **so that** the numbers can be trusted in appraisals.
- **Acceptance Criteria**:
  - AC-1: Sprints scored = count of numeric scores in the selected sprint range; RUN and not-scored are excluded.
  - AC-2: Total = sum of numeric scores; Average = Total ÷ Sprints scored, displayed to 2 decimals (stored unrounded).
  - AC-3: Last 3 = mean of the most recent 3 scored sprints; Prior 3 = mean of the 3 scored before those; Momentum = Last 3 − Prior 3, only when Sprints scored ≥ 6 (configurable), else null.
  - AC-4: Best, Worst and Variability (population standard deviation) are computed over scored sprints.
  - AC-5: Results match the reference HTML for the S122–S135 dataset to ±0.01.
- **Story Points**: 5 — **Priority**: Must

**US-04-02** *(epic E-04)*
- **As** Management, **I want** rating bands applied consistently, **so that** ratings are comparable.
- **Acceptance Criteria**:
  - AC-1: Default bands: Average ≥ 8.00 → Outstanding; 6.00–7.99 → Exceeds; 5.00–5.99 → Meets; < 5.00 → Needs Improvement; no scores → N/A.
  - AC-2: Band thresholds are read from Settings (E-08); changing them recalculates all views without re-import.
- **Story Points**: 2 — **Priority**: Must

**US-04-03** *(epic E-04)*
- **As** Management, **I want** group metrics weighted by score observations, **so that** teams with more scored sprints are represented fairly.
- **Acceptance Criteria**:
  - AC-1: Team / designation weighted average = Σ scores of members ÷ count of numeric scores (matching the "Performance Insights" sheet).
  - AC-2: Per-sprint org average = mean of numeric scores in that sprint; participants = count of those scores; coverage = participants ÷ active employees.
  - AC-3: Group responses also return headcount and score-observation count.
- **Story Points**: 3 — **Priority**: Must

**US-04-04** *(epic E-04)*
- **As** Management, **I want** rankings that are fair to newcomers and long-tenured engineers, **so that** a single good sprint does not top the list.
- **Acceptance Criteria**:
  - AC-1: Overall ranking orders by Average desc, tie-break Total desc, then name asc; ties on both Average and Total share a rank (competition ranking: 1, 2, 2, 4).
  - AC-2: Rankings are available org-wide and within each designation.
  - AC-3: Last-N ranking uses only the most recent N sprints that have any scores (default N = 6, configurable).
  - AC-4: Top-N performers include only engineers with ≥ minimum sprints (default 5, configurable); those below the threshold are shown as "Not yet eligible" rather than ranked.
- **Story Points**: 5 — **Priority**: Must

**US-04-05** *(epic E-04)*
- **As an** HR Admin, **I want** every metric to respect the selected sprint range, **so that** I can produce reports for an appraisal period.
- **Acceptance Criteria**:
  - AC-1: Given a from/to sprint selection, all metrics, charts and rankings use only sprints within it.
  - AC-2: Default range = all sprints.
- **Story Points**: 3 — **Priority**: Must

### E-05 — KPI Dashboard

**US-05-01** *(epic E-05)*
- **As** Management, **I want** headline KPI cards, **so that** I can see org health at a glance.
- **Acceptance Criteria**:
  - AC-1: Cards show: engineers in view, org average (/10), latest-sprint average and participants, latest-sprint coverage %, and count + % per rating band.
  - AC-2: Card accent colour follows the band of the value (green ≥8, teal ≥6, amber ≥5, red <5).
  - AC-3: Cards update within 300 ms of any filter change.
- **Story Points**: 3 — **Priority**: Must

**US-05-02** *(epic E-05)*
- **As an** HR Admin, **I want** filters for designation, team, rating, sprint coverage, sprint range, status and name search, **so that** I can focus on a segment.
- **Acceptance Criteria**:
  - AC-1: Filters combine with AND logic; coverage options: All, 10+ sprints, 6+ sprints, fewer than 6.
  - AC-2: "Reset" restores defaults; the current filter state is reflected in the URL query so a view can be bookmarked and reloaded.
- **Story Points**: 3 — **Priority**: Must

**US-05-03** *(epic E-05)*
- **As** Management, **I want** charts for average by designation, average by team, rating distribution and org average per sprint, **so that** I can compare groups and see trends.
- **Acceptance Criteria**:
  - AC-1: Designation and team bar charts use a 0–10 scale; tooltips show headcount.
  - AC-2: The rating distribution chart shows the four bands with counts.
  - AC-3: The sprint trend line shows per-sprint averages with participant counts in the tooltip; sprints with no scores are gaps, not zero.
  - AC-4: All charts respect current filters and have an accessible data-table alternative.
- **Story Points**: 5 — **Priority**: Must

**US-05-04** *(epic E-05)*
- **As** Management, **I want** a "biggest movers" momentum chart, **so that** I can spot who is improving or declining.
- **Acceptance Criteria**:
  - AC-1: Shows engineers with non-null momentum; if more than 14, shows the top 7 risers and bottom 7 decliners.
  - AC-2: Bars are green for ≥0 and red for <0; the tooltip shows "prior 3 → last 3".
  - AC-3: With no eligible engineers, an explanatory empty state is shown.
- **Story Points**: 3 — **Priority**: Must

**US-05-05** *(epic E-05)*
- **As an** HR Admin, **I want** a sortable engineer table, **so that** I can rank and scan individuals.
- **Acceptance Criteria**:
  - AC-1: Columns: Rank, Name, Team, Designation, Sprints, Total, Avg, Last 3, Momentum, Rating.
  - AC-2: Clicking a header toggles sort; nulls always sort last; text columns default ascending and numeric columns default descending.
  - AC-3: Rows are keyboard-focusable and open the engineer profile (E-06) on click/Enter.
- **Story Points**: 3 — **Priority**: Must

**US-05-06** *(epic E-05)*
- **As an** HR Admin, **I want** a data-check banner and an empty state, **so that** I know when data is suspect or missing.
- **Acceptance Criteria**:
  - AC-1: Given the latest import has warnings, then a dismissible banner summarises them with a link to the import detail.
  - AC-2: Given no data has been imported, then the dashboard shows a call-to-action to upload the master sheet.
  - AC-3: The header shows the sprint range, engineer count, last import time and band legend.
- **Story Points**: 2 — **Priority**: Must

### E-06 — Engineer Profile & Rankings

**US-06-01** *(epic E-06)*
- **As** Management, **I want** an engineer profile with their sprint-by-sprint trend against the org average, **so that** I can prepare for an appraisal conversation.
- **Acceptance Criteria**:
  - AC-1: Shows name, designation, team, overall rank of N, Average, Total, Sprints, Rating, Last 3, Momentum, Best/Worst, Variability, RUN-sprint count.
  - AC-2: The line chart plots the engineer's scores (gaps for RUN/N/A) with a dashed org-average line per sprint.
  - AC-3: The profile is reachable as a modal from the table and as a direct URL (`/employees/[id]`).
  - AC-4: A score table lists every sprint with its value or status (RUN / N/A).
- **Story Points**: 5 — **Priority**: Must

**US-06-02** *(epic E-06)*
- **As** Management, **I want** a Rankings page with overall, per-designation and last-N rankings, **so that** I can replace the ranking blocks in the Excel sheet.
- **Acceptance Criteria**:
  - AC-1: Tabs: Overall, By designation, Last N sprints (shows window, e.g. "S133–S138").
  - AC-2: Each row shows rank, name, designation, team, sprints, average, total.
  - AC-3: Ineligible engineers (below the minimum sprints) are listed separately and labelled.
- **Story Points**: 5 — **Priority**: Must

**US-06-03** *(epic E-06)*
- **As** Management, **I want** team and designation summary tables, **so that** I can compare groups numerically.
- **Acceptance Criteria**:
  - AC-1: The team summary shows team, people, score observations, total score, weighted average and rank.
  - AC-2: The designation summary shows designation, people, score observations and weighted average.
  - AC-3: An auto-generated one-paragraph "Interpretation" names the top established performer, the overall #1 by raw average, the leading team and the latest sprint average and coverage.
- **Story Points**: 3 — **Priority**: Should

### E-07 — Reports & Export

**US-07-01** *(epic E-07)*
- **As** Management, **I want** to print or save the dashboard as PDF, **so that** I can circulate it in meetings.
- **Acceptance Criteria**:
  - AC-1: The print stylesheet hides navigation and filters, keeps panels from splitting across pages, and prints a header with the applied filters, sprint range and generation timestamp.
  - AC-2: Output fits A4 portrait and landscape; charts render legibly in grayscale.
  - AC-3: Every page footer reads "Cloudtech Services · Confidential".
- **Story Points**: 3 — **Priority**: Should

**US-07-02** *(epic E-07)*
- **As an** HR Admin, **I want** to export the filtered engineer table and rankings to Excel/CSV, **so that** I can do further analysis.
- **Acceptance Criteria**:
  - AC-1: The export contains exactly the rows and columns currently in view, plus one column per sprint in range.
  - AC-2: Cell values starting with `=`, `+`, `-`, `@` are escaped to prevent CSV/formula injection.
  - AC-3: The filename pattern is `cloudtech-kpi_<from>-<to>_<yyyymmdd>.xlsx`.
- **Story Points**: 3 — **Priority**: Should

**US-07-03** *(epic E-07)*
- **As** Management, **I want** a printable individual appraisal summary, **so that** I can hand it over during a review.
- **Acceptance Criteria**:
  - AC-1: One page per engineer: profile stats, trend chart, rank within designation, rating, sprint range.
  - AC-2: Can be generated for a single engineer, or for all engineers in a team as one print job.
- **Story Points**: 5 — **Priority**: Could

### E-08 — Settings & Configuration

**US-08-01** *(epic E-08)*
- **As an** HR Admin, **I want** to configure rating bands and calculation parameters, **so that** policy changes don't need a developer.
- **Acceptance Criteria**:
  - AC-1: Editable: band thresholds and labels, last-N window (1–20), minimum sprints for momentum (default 6), minimum sprints for Top-N (default 5), Top-N size (default 10), data-check tolerance (default 0.02).
  - AC-2: Validation: thresholds must strictly descend and lie within 0–10.
  - AC-3: Saving recalculates all views immediately; changes are audit-logged.
- **Story Points**: 3 — **Priority**: Should

### E-09 — Audit & Data Governance

**US-09-01** *(epic E-09)*
- **As** Management, **I want** an audit log of sensitive actions, **so that** changes to performance data are accountable.
- **Acceptance Criteria**:
  - AC-1: Logged events: login success/failure, logout, password change, import preview, import commit, rollback, employee edit/merge, settings change.
  - AC-2: Each entry records timestamp (UTC, displayed as Asia/Kathmandu), actor, action, entity, and before/after summary.
  - AC-3: The log is read-only in the UI and filterable by date and action.
- **Story Points**: 3 — **Priority**: Should

**US-09-02** *(epic E-09)*
- **As an** HR Admin, **I want** to download a backup of the database and the original uploaded files, **so that** data survives a disk failure or a move to a server.
- **Acceptance Criteria**:
  - AC-1: The "Download backup" action produces a timestamped archive of the database file and stored import files.
  - AC-2: The documented restore procedure returns the app to the exact backed-up state.
- **Story Points**: 2 — **Priority**: Could

---

## BRD Outline

### 1. Business Problem Statement
Engineering KPI scores are collected per team, compiled by hand into a master Excel sheet, and recalculated with complex formulas (SORTBY/XLOOKUP, external workbook links). Producing each sprint's report takes hours. The process is error-prone: sheet averages have diverged from the underlying scores, names are inconsistent across sheets, and newcomers with one sprint can top raw rankings. There is no central employee record. Management lacks a reliable, timely view of trends and momentum for sprint reviews and appraisals.

### 2. Business Objectives
1. **BO-1:** Cut sprint KPI report preparation from the current multi-hour effort to **≤ 10 minutes** (upload → verify → view) by the end of the first month after release (2026-12-13).
2. **BO-2:** Achieve **100% calculation accuracy** against the agreed rules (E-04), verified by automated tests and a reconciliation against the S122–S138 data, before release on 2026-11-13.
3. **BO-3:** Make the dashboard (or its PDF export) **the only source** for sprint performance reviews in Management meetings, starting with the first appraisal cycle after release.
4. **BO-4:** Detect and surface **100% of average/total mismatches** and duplicate names in imported sheets at import time, from the first import.
5. **BO-5:** Establish a persistent employee and score history (≥ 17 sprints, 49 engineers migrated) as the foundation for future HRM modules, at release.

### 3. Success Metrics

| KPI | Target | Measurement method |
|---|---|---|
| Time to publish sprint report | ≤ 10 min per sprint | Import batch timestamps (preview → commit) + HR self-report for the first 4 sprints |
| Calculation accuracy | 100% match (±0.01) | Automated unit/integration tests on reference datasets; reconciliation report vs reference HTML / workbook |
| Data-quality issues caught at import | 100% of mismatches flagged | Seeded test files with known errors; warning counts per import |
| Management adoption | Used in 100% of sprint review meetings after release | Management confirmation; PDF export / login counts in the audit log |
| Import success rate | ≥ 95% of uploads succeed first time with valid files | Import batch status in the audit log |

### 4. Stakeholder Map

| Stakeholder | Role | Interest | Influence |
|---|---|---|---|
| Management (CEO / CTO / Directors) | Sponsor, consumer of reports | Trustworthy view of performance for reviews, appraisals and promotions | High |
| HR team | Product owner, sole system user (HR Admin) | Less manual work, accurate data, easy import, printable reports | High |
| Team Leads | Source data providers (per-team workbooks) | Their team's scores reflected correctly | Medium (no system access in v1) |
| Engineers | Data subjects | Fair and accurate evaluation; privacy of their scores | Low (no access in v1) |
| IT / DevOps | Future server hosting | Easy deployment, backups, security | Medium |

### 5. Scope Statement

**In scope (v1.0)**
- **SC-01:** Single Next.js TypeScript application (frontend and backend in one project), running locally with a file-based database (SQLite via an ORM, portable to PostgreSQL).
- **SC-02:** HR Admin authentication (email/password), session management, password change, seeded first admin.
- **SC-03:** Import of the KPI Master Sheet (.xlsx; .csv fallback) — Compile Sheet layout — with validation, preview/diff, data-quality warnings, versioned batches and rollback of the latest batch.
- **SC-04:** Employee, team, designation and sprint master data derived from imports, with HR editing, aliases and merge.
- **SC-05:** Server-side KPI calculation engine (averages, totals, weighted group averages, bands, momentum, last-N, rankings, eligibility thresholds, sprint-range filtering).
- **SC-06:** Interactive KPI dashboard with parity to `Cloudtech_KPI_Dashboard_S122-S135.html`, plus sprint-range filter, coverage and bookmarkable filters.
- **SC-07:** Engineer profile, Rankings page, team/designation summaries.
- **SC-08:** Print/PDF output and Excel/CSV export.
- **SC-09:** Settings for bands and calculation parameters.
- **SC-10:** Audit log and database backup download.

**Out of scope (v1.0)**
- **OOS-01:** Leave and attendance management.
- **OOS-02:** Payroll, salary, tax, SSF/PF/CIT.
- **OOS-03:** Formal appraisal workflows (self-assessment, sign-off, calibration).
- **OOS-04:** Logins for Team Leads, Management, employees, or multiple roles/permissions (single HR Admin role only).
- **OOS-05:** Recruitment and onboarding.
- **OOS-06:** Live integrations (Zoho Sprints, Jira, Microsoft 365 SSO); scores enter only through import and HR edits.
- **OOS-07:** In-app sprint score entry forms replacing per-team workbooks (beyond correcting individual values).
- **OOS-08:** Native mobile apps (responsive web only).
- **OOS-09:** Multiple organisations / multi-tenancy.
- **OOS-10:** Server deployment, CI/CD and production hosting (HR will deploy manually later; the app must be deployable but deployment is not delivered).
- **OOS-11:** Importing the "Sheet1" team roster (sub-roles, multi-team membership) — see OQ-02.

---

## Non-Functional Requirements

### Performance
- **NFR-01:** The dashboard's first meaningful paint is ≤ 2.0 s on a typical office laptop (local run, production build) with 200 employees × 52 sprints.
- **NFR-02:** Filter, sort and search interactions update all cards, charts and the table within ≤ 300 ms (p95) for the same dataset.
- **NFR-03:** Parsing and previewing a 5 MB / 200-row master sheet completes in ≤ 5 s; commit in ≤ 3 s.
- **NFR-04:** KPI API responses are ≤ 500 ms p95 for the full dataset.

### Scalability
- **NFR-05:** Supports ≥ 500 employees and ≥ 200 sprints without schema change.
- **NFR-06:** The data-access layer is abstracted (repository pattern / ORM) so switching SQLite → PostgreSQL needs only configuration and a migration, no domain or UI changes.

### Security
- **NFR-07:** Passwords are hashed with argon2id or bcrypt (cost ≥ 12); plaintext passwords are never logged or stored.
- **NFR-08:** Every page and API route except `/login` requires an authenticated session, enforced server-side (middleware plus a per-handler check); there is no client-only gating.
- **NFR-09:** Session cookies are httpOnly, SameSite=Lax, and Secure when served over HTTPS; state-changing requests are CSRF-protected.
- **NFR-10:** Uploads accept only `.xlsx`/`.csv` (by extension and magic bytes), ≤ 5 MB; parsing never evaluates formulas or macros; uploaded files are stored outside the web root.
- **NFR-11:** All user input is validated server-side with schemas (e.g. Zod); all rendered names are output-escaped (no `dangerouslySetInnerHTML` with data).
- **NFR-12:** Exports are protected against CSV/formula injection.
- **NFR-13:** Secrets (session secret, admin seed credentials, DB URL) come only from environment variables; `.env*` is git-ignored.
- **NFR-14:** Dependencies have no known critical/high vulnerabilities at release (`npm audit`), per the aaid security gate.
- **NFR-15:** Personal data handling follows the Nepal Individual Privacy Act 2075: data is used only for performance management, only HR Admins can access it, and an HR-triggered deletion of an employee's data is supported.

### Availability
- **NFR-16:** v1 is a local, single-user deployment: start with one command (`npm run start` after build) and recover from a restart with no data loss.
- **NFR-17:** Imports are atomic; a crash mid-import leaves the database in its prior state.
- **NFR-18:** Backup (US-09-02) supports a recovery point of the last manual backup; the restore procedure is documented.

### Maintainability
- **NFR-19:** Clean architecture per `aaid.config.yaml`: domain (KPI rules, pure TypeScript, no framework imports) → application (use cases) → infrastructure (DB, Excel parser) → presentation (Next.js routes/components).
- **NFR-20:** TypeScript `strict` mode; 0 ESLint errors; cyclomatic complexity ≤ 10 per function.
- **NFR-21:** ≥ 80% test coverage overall; 100% branch coverage on the KPI calculation engine and import parser; unit and integration tests required (aaid gates).
- **NFR-22:** Reference fixtures (`KPI Master Sheet (2).xlsx` and the S122–S135 dataset from the HTML) are checked in as test fixtures with expected outputs.
- **NFR-23:** A README covers setup, env vars, seed, run, backup/restore and the steps to move to a server.

### Usability
- **NFR-24:** WCAG 2.1 AA: colour contrast ≥ 4.5:1, rating is never conveyed by colour alone (always shown with a text label), full keyboard navigation, focus-visible styles, and the modal traps focus and closes on Esc.
- **NFR-25:** Responsive from 360 px to 1920 px wide; charts stack to one column below 760 px.
- **NFR-26:** Visual language follows the reference HTML (navy `#10233F`, teal `#0F6E78`, band colours) for continuity with existing reports.
- **NFR-27:** A first-time HR user can complete import → dashboard in ≤ 5 minutes without training (validated in a moderated test with one HR user).
- **NFR-28:** Honours `prefers-reduced-motion`.

### Internationalisation
- **NFR-29:** UI language is English; all strings are centralised to allow future localisation (e.g. Nepali).
- **NFR-30:** Timestamps are stored in UTC and displayed in Asia/Kathmandu (UTC+05:45); dates use the `DD MMM YYYY` format.
- **NFR-31:** Scores display with exactly 2 decimals and tabular numerals; names support full Unicode, including Devanagari.

---

## Open Questions

- **OQ-01:** There is no employee ID in the master sheet, so employees are matched by normalised name. Should HR add an "Employee Code" column to the sheet for reliable matching going forward? — *Owner: HR* — *Deadline: Sprint 1 (2026-10-23)*
- **OQ-02:** "Sheet1" lists sub-roles (QA, BA, Designer, DevOps, DBA) and puts some people in two teams (e.g. Niva Awale, Ramita Shrestha, Ankit Belal, Ram Chandra Dahal). Do we need multi-team membership or sub-roles in v1, or is the Compile Sheet's single team authoritative? — *Owner: HR / Management* — *Deadline: Sprint 1 (2026-10-23)*
- **OQ-03:** Team names differ between sheets ("Team Bimal" vs "Bimal", "Run Team" vs "RUN", a "Design" team that doesn't appear in the Compile Sheet). Confirm the canonical team list. — *Owner: HR* — *Deadline: Sprint 1 (2026-10-23)*
- **OQ-04:** Should the official ranking be org-wide (as the reference HTML shows) or per designation (as the Excel ranking block computes), or both? Which appears on appraisal printouts? — *Owner: Management* — *Deadline: Sprint 1 (2026-10-27)*
- **OQ-05:** Confirm the eligibility thresholds: 6 sprints for momentum and 5 sprints for Top-N. Should newcomers (fewer than 5 sprints) be excluded from the overall rank, or ranked and flagged? — *Owner: Management* — *Deadline: Sprint 1 (2026-10-27)*
- **OQ-06:** Confirm the band boundaries are inclusive at the lower bound (e.g. 8.00 = Outstanding, 5.99 = Meets), and whether bands apply to the full-history average or the selected sprint range. — *Owner: Management* — *Deadline: Sprint 1 (2026-10-27)*
- **OQ-07:** Should a later import be able to clear a score (e.g. a number changed to N/A), or should blanks in a new file never overwrite stored numbers? — *Owner: HR* — *Deadline: Sprint 1 (2026-10-23)*
- **OQ-08:** How many HR Admin accounts are needed in v1 (one shared, or one per HR person for audit accountability)? — *Owner: HR* — *Deadline: Sprint 1 (2026-10-21)*
- **OQ-09:** Will per-team workbooks ever be imported directly (replacing the compile step), or will the Compile Sheet always be the single input? — *Owner: HR* — *Deadline: Before v1.1 planning*
- **OQ-10:** Target server for the later manual deployment (Windows/Linux VM, on-prem, cloud)? This affects the choice between SQLite and PostgreSQL and the HTTPS setup. — *Owner: Management / IT* — *Deadline: Sprint 2 (2026-11-06)*
- **OQ-11:** How long should score history be kept, and should leavers' data be anonymised after a period (privacy)? — *Owner: HR / Management* — *Deadline: Before server deployment*

---

## Assumptions

- **Timeline:** v1.0 delivered in two 2-week sprints. Sprint 1 (2026-10-19 → 10-30) covers E-01, E-02, E-03 and E-04. Sprint 2 (2026-11-02 → 11-13) covers E-05, E-06, E-07, E-08 and E-09. Target release is **2026-11-13**.
- The sprint score scale is 0–10, and scores in the source file are already final (no in-app approval).
- The Compile Sheet layout (header row, `S###` sprint columns, section rows) stays stable. Small variations in column order and whitespace are tolerated.
- There is one organisation (Cloudtech Services) and one role (HR Admin).

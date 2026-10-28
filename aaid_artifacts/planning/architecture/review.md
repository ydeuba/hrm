---
artifact: architecture
reviewed: 2026-10-15
verdict: NOT_READY
counts:
  critical: 0
  high: 4
  medium: 12
  low: 5
resolution: all 21 findings applied to architecture.md / arch-views.md (ADR-016, ADR-017, ADR-018 added; see "Resolutions applied" below); post-fix verdict READY
---

# Adversarial Review — architecture.md

**Scope:** `aaid_artifacts/planning/architecture/architecture.md`, `arch-views.md`. Checked against `requirements.md`, `KPI Master Sheet (2).xlsx` and `Cloudtech_KPI_Dashboard_S122-S135.html`.
**Panel:** Skeptic (consistency) · Builder (feasibility) · Breaker (edge cases) · Tester (testability).

## Evidence gathered

- **E1 (raw precision):** 560 numeric sprint cells in the Compile Sheet; one has more than 2 decimals: `E44 = 5.975` (shown as `5.98`). *Correction (2026-10-15, during E-04-01):* `5.975 * 100` actually evaluates to `597.5`, so `Math.round` gives 598. The finding still holds: naive rounding fails for 68 of the 1,000 possible 3-dp half values (e.g. `1.005 * 100 = 100.4999…` → 100), so the half-up-with-epsilon rule and the `PRECISION_ROUNDED` warning remain necessary.
- **E2 (sheet ranking uses unrounded averages):** Mandip Thapa (9.00 over 1 sprint, total 9.00) is ranked 7 and Sajjan Khanal (shown as 9.00; actually 80.96/9 = 8.9956) is ranked 8. If averages were equal at 2 dp, the tie-break on total (US-04-04) would put Sajjan first. So the sheet ranks on the unrounded average.
- **E3 (reference HTML ranks don't follow averages):** in the HTML `RAW` data, Jeevan Joshi has average 9.07 and rank 42, while Dipak Raj Giri has 8.85 and rank 2. The HTML copied those ranks from an older sheet (its own legend says "Rank = Overall Ranking as recorded in the master sheet"); they don't follow any rule we can reproduce.
- **E4 (team-name drift):** Sheet1 uses `Bimal`, `RUN` and `Design`, while the Compile Sheet uses `Team Bimal` and `Run Team` (requirements OQ-03).

## Findings

### HIGH

1. `[HIGH] ADR-004 / US-04-02 / US-04-04 — The comparison precision is undefined. Bands and ranks use the "unrounded" average, but the UI shows 2 dp. A 7.996 average would display as 8.00 yet be rated Exceeds. Float ties ("ties on both Average and Total share a rank") are unreliable, and E2 shows the sheet ranks on exact averages while the reference HTML bands on rounded ones. Two engineers would build this differently, and appraisal ratings would be wrong at band boundaries.` **Fix:** add ADR-016. Rank by the exact average, compared as integer cross-products `totalCentiA × nB` vs `totalCentiB × nA` (matches the sheet, E2). Assign bands from the average rounded half-up to 2 dp (what users see; matches the reference HTML). Ties exist only when the exact rationals are equal. When two displayed averages are equal but ranks differ, show 3 dp in the tooltip.
2. `[HIGH] ADR-014 — Golden tests assert "ranks … to ±0.01" against the reference HTML, but the HTML's ranks don't follow any reproducible rule (E3). The build would either fail forever or push developers into reverse-engineering a broken ranking.` **Fix:** take golden *ranks* only from the current workbook's Compile Sheet "Overall Rankings" block. Use the reference HTML only for per-engineer total, average, last-3, momentum, best/worst and spread. Record the HTML rank discrepancy as a known difference.
3. `[HIGH] Data model / ADR-007 / US-03-02 / US-03-04 — Teams and designations have no aliases, and the import ignores HR's edits. If HR renames "Run Team" to "RUN" (OQ-03, E4), the next import doesn't recognise "Run Team" and creates the team again. If HR corrects an employee's team in the app, the next import silently overwrites it with the sheet's value. Both lead to a data-model rework and to HR losing trust in the data.` **Fix:** add `TeamAlias` and `DesignationAlias` (same pattern as EmployeeAlias); a rename keeps the old normalised name as an alias. Add `Employee.teamLocked` and `designationLocked`, set when HR edits those fields manually. A locked field is not overwritten on import; the preview shows a `LOCKED_FIELD_DIFFERS` warning instead.
4. `[HIGH] NFR-15 / DELETE /employees/{id} / ADR-007 / ADR-013 — "Privacy erase" isn't real erasure. The original upload files (which contain the person's name and every score), the ImportChange before/after JSON, ImportIssue.employeeName and AuditEvent payloads all keep the data. Rolling back a batch could even recreate the erased employee from the journal. The privacy requirement can't be met as designed.` **Fix:** add ADR-017, defining what erase removes. It deletes the employee, scores and aliases. It redacts `ImportChange`, `ImportIssue` and `AuditEvent` payloads by entity key or name, replacing them with `"[erased]"`. It bumps `scoreRevision`, which blocks rollback of every earlier batch. Uploaded originals are kept only for `uploadRetentionDays` (default 90; OQ-11); an erase deletes all stored originals that contain the person's name, and the UI says so before you confirm. The erase itself is audit-logged without personal data (employee ID only).

### MEDIUM

5. `[MEDIUM] ADR-007 / ADR-015 / SystemState — One `dataRevision` is bumped by settings changes, score corrections and merges alike, so changing a band threshold after an import blocks its rollback for no reason. Also, "check revision then write" inside a Prisma interactive transaction on SQLite can race (both readers pass; the second write fails with SQLITE_BUSY instead of a clean 409).` **Fix:** split it into `scoreRevision` (imports, rollbacks, edits, merges, erasures) and `settingsRevision` (settings only). Rollback and preview staleness check only `scoreRevision`; ETags and caches use both. Bump the revision with a conditional update (`UPDATE … SET scoreRevision = base+1 WHERE scoreRevision = base`, and require exactly 1 row affected) as the **first** statement of the transaction.
6. `[MEDIUM] ADR-005 — Lockout semantics are ambiguous. "5 failures in 15 min" means the block ends when the oldest failure ages out, not 15 min after the fifth (US-01-01 AC-3). It's also unspecified whether attempts during lockout count, or whether unknown emails are tracked. Unknown-email logins skip argon2, which lets an attacker tell which emails exist from response timing.` **Fix:** on the 5th failure within 15 min, write `lockedUntil = now + 15 min` to a `LoginThrottle{email, failures, windowStart, lockedUntil}` row. Attempts during lockout return 429 without being checked or counted. The same rules apply to unknown emails. Always run argon2 verify against a dummy hash when the user doesn't exist.
7. `[MEDIUM] ADR-005 / ADR-006 — The session cookie's lifetime isn't specified, and Server Components can't set or clear cookies, so a "sliding refresh" in `requireSession()` called from RSC isn't possible. Throttling `lastSeenAt` writes to every 5 min makes the effective idle timeout 60–65 min.` **Fix:** set the cookie `Max-Age` to the absolute lifetime (12 h); idle expiry is enforced only server-side. The DAL never writes cookies; on expiry it deletes the Session row and redirects, and `/login` clears any stale cookie. Document the idle tolerance as 60 min + up to 5 min, and accept it.
8. `[MEDIUM] ADR-009 — The payload estimate is wrong. `{kind:'scored',value:8.33}` is about 28 bytes, so 500×200 cells is about 2.8 MB of JSON, not 1.5 MB, and the RSC payload is also embedded in the HTML.` **Fix:** use a compact encoding, `cells: (number | 'R' | null)[]` (score value, RUN, or not scored), giving about 0.6 MB at the ceiling. Fetch the dataset on the client after the shell renders when it exceeds 1 MB.
9. `[MEDIUM] Cross-cutting / CSP — A nonce-based `script-src` can't be set from `next.config` `headers()` (that header is static per build).` **Fix:** generate the nonce in `proxy.ts` and set the CSP header there (every authenticated page is dynamic anyway). Read the nonce in the root layout via `headers()`.
10. `[MEDIUM] ADR-008 / POST /imports — Route Handlers have no built-in body size limit, and a 5 MB `.xlsx` (ZIP) can expand to gigabytes (a zip bomb).` **Fix:** reject when `Content-Length > UPLOAD_MAX_BYTES`, and stream-count bytes while reading. Before SheetJS parses the file, read the ZIP central directory and reject if the total uncompressed size exceeds 50 MB or there are more than 200 entries.
11. `[MEDIUM] ADR-004 — The rounding rule for values with more than 2 decimals is undefined. E1 shows `5.975` would be stored as 5.97 by naïve rounding, while Excel displays 5.98.` **Fix:** convert with half-up rounding plus an epsilon: `centi = Math.round(v * 100 + 1e-7)`. Emit a `PRECISION_ROUNDED` warning naming the cell. Covered by ADR-016.
12. `[MEDIUM] API commit contract — `confirmMerges: [string, string][]` doesn't say what the strings are, and doesn't say what happens to near-duplicates HR doesn't confirm.` **Fix:** use `{ merges: { fileName: string; existingEmployeeId: string }[] }`. A confirmed pair matches the existing employee and adds the file's spelling as an alias. An unconfirmed near-duplicate becomes a new employee, and the preview states this.
13. `[MEDIUM] Data model — Name uniqueness is split between `Employee.normalisedName @unique` and `EmployeeAlias.normalisedName @unique`, so an alias can collide with another employee's canonical name. Two different people with the same name can't be represented at all.` **Fix:** make `EmployeeAlias` the single name namespace: the canonical name is an alias row with `source = CANONICAL`, and `Employee.normalisedName` is an indexed, non-unique copy. When a same-name collision is detected, the import fails with `AMBIGUOUS_NAME` until an `employeeCode` column is used (OQ-01). Add an optional "Code" column to header detection.
14. `[MEDIUM] ADR-015 / settings — Defaults are missing for `rankingScope`, `importNotScoredOverwrites` and the minimum sprints for the last-N ranking. The table's "Rank" column under `rankingScope = designation` is undefined.` **Fix:** add a full defaults table: rankingScope=`overall`; importNotScoredOverwrites=`true` (the file is the source of truth; OQ-07); lastNMinSprints=`1` (matches the sheet); rankEligibilityMinSprints=`1` for the overall rank (matches the sheet) and topN uses `topNMinSprints=5`. The dashboard Rank column always shows the overall rank; designation rank appears on the profile and the Rankings tab.
15. `[MEDIUM] US-02-03 / ADR-007 — It doesn't say whether commit re-applies the stored diff or recomputes it.` **Fix:** commit re-reads the stored `parsed` rows and recomputes the diff inside the transaction once the revision guard has passed. Because the revision is unchanged it should equal the preview; if it doesn't, abort with 409.
16. `[MEDIUM] ADR-014 / NFR-02, NFR-03 — The performance targets have no automated check.` **Fix:** add Vitest `bench` and threshold tests: `computeDashboard` on a synthetic 500×200 dataset in ≤ 100 ms on the CI/dev machine; parse plus diff of a generated 200-row, 5 MB workbook in ≤ 5 s; and a Playwright check that filter-to-repaint is ≤ 300 ms.

### LOW

17. `[LOW] ADR-003 — It doesn't state the minimum Prisma version needed for `Json` and `enum` on SQLite.` **Fix:** require Prisma ≥ 6.2 (prefer the current major) and verify at scaffold time.
18. `[LOW] API / NFR-08 — `/api/health` is unauthenticated, but NFR-08 says "every API except /login", and it exposes `version`.` **Fix:** list `/api/health` as an explicit exception in NFR-08, and return only `{status, db}`.
19. `[LOW] US-09-02 AC-2 — The restore procedure isn't designed.` **Fix:** document restore: stop the app, replace `DATA_DIR/hrm.db` and `uploads/` from the zip, run `prisma migrate deploy`, start. Add an integration test that restores a backup into a temporary `DATA_DIR` and compares row counts.
20. `[LOW] ADR-006 — The Origin check compares to Host, which breaks behind a future reverse proxy.` **Fix:** add a `TRUSTED_ORIGINS` env var (comma-separated); when it is set, compare against it.
21. `[LOW] ADR-003 / Dependency graph — The native SQLite driver (better-sqlite3) needs a prebuilt binary for Node 24 on Windows.` **Fix:** verify at scaffold time; the fallback is Prisma's libSQL adapter (`@prisma/adapter-libsql`, a file URL), which has prebuilt binaries.

## Panel dissent
- The Builder rated #3 (team aliases) MEDIUM, arguing HR could avoid renaming. The Skeptic rated it HIGH because OQ-03 makes renames near-certain and the requirements allow them (US-03-04). **Kept HIGH.**
- The Tester rated #2 CRITICAL (the build would never go green). Others rated it HIGH because the fix is confined to test fixtures. **Kept HIGH.**

## Verdict

**NOT_READY** (4 HIGH).

## Resolutions applied (2026-10-15)

| # | Resolution in architecture.md |
|---|---|
| 1, 11 | New **ADR-016** (rounding at ingest, integer cross-product ranking, bands on the 2-dp value); ADR-004 cross-reference |
| 2, 16 | ADR-014 rewritten: golden ranks from the workbook only, HTML ranks excluded; perf bench and threshold tests added |
| 3, 13 | New **ADR-018** (alias namespaces for Employee/Team/Designation, `teamLocked`/`designationLocked`, `AMBIGUOUS_NAME`, optional Code column); data model, ER diagram and `PATCH /employees/{id}/locks` added |
| 4 | New **ADR-017** (erasure scope, redaction, upload deletion, `uploadRetentionDays`); DELETE endpoint description updated |
| 5, 15 | ADR-007 rewritten: `scoreRevision` / `settingsRevision`, conditional increment as the first statement, diff recomputed at commit; SystemState, cache key and ETag updated; arch-views sequence updated |
| 6, 7 | ADR-005 rewritten: `LoginThrottle`, dummy-hash verify, cookie Max-Age, no cookie writes from the DAL; data model and auth flow diagram updated |
| 8 | ADR-009 and `KpiDatasetDto`: compact cell encoding, corrected capacity figures |
| 9 | Cross-cutting: CSP nonce generated in `proxy.ts` |
| 10 | ADR-008: Content-Length and streaming limit, zip-bomb guard, `UPLOAD_MAX_UNCOMPRESSED_BYTES` |
| 12 | Commit contract changed to `{ merges: { fileName; existingEmployeeId }[] }` with unconfirmed behaviour defined |
| 14 | ADR-015 defaults table (all settings) |
| 17, 21 | ADR-003: Prisma ≥ 6.2, native driver check, libSQL fallback |
| 18 | `/api/health` returns `{status, db}` only and is listed as an explicit exception in ADR-006 |
| 19 | Cross-cutting: restore procedure and restore integration test |
| 20 | ADR-006 and env: `TRUSTED_ORIGINS` |

**Post-fix verdict: READY.** The 0 CRITICAL / 4 HIGH findings are resolved. The remaining risk lies with requirements open questions (OQ-01…OQ-11); because of ADR-015 and ADR-018, answering them changes settings only, not the architecture.

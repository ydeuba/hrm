# E-00-06 — Golden test fixtures · Implementation record

## Files
- `tests/fixtures/kpi-master-sheet.xlsx`, `tests/fixtures/reference-dashboard-s122-s135.html`: copies of the source artefacts.
- `tests/fixtures/golden-generator.ts`: builds the expectations from cached workbook values and from the reference HTML's `RAW` data plus its **own** `enrich()`/`band()` algorithm, ported verbatim. It doesn't import anything from `src/`, so the expectations stay independent of the code under test.
- `scripts/generate-golden-fixtures.ts` (`npm run fixtures:generate`) → `expected-workbook.json`, `reference-s122-s135.json`.
- `tests/fixtures/boundary-cases.json`: hand-built edge cases.
- `tests/unit/fixtures/golden-fixtures.test.ts`.

## What the expectations contain
- **Workbook** (49 employees, S122–S138, 560 scored cells; S139–S141 detected as empty):
  - per employee: cells (number / RUN / N/A), sprints counted, sheet total and average, overall rank, and last-N average, sprints and rank;
  - the last-N window (6, S133–S138);
  - Performance Insights: headline, 8 teams, 4 designations, the 20-row trend, Top 10.
- **Reference HTML** (43 engineers, S122–S135): total, average, last-3, prior-3, momentum, best, worst, spread and band. **No `rank`** (ADR-014).
- **Boundary cases:**
  - an average of 7.995 is banded Outstanding, 7.9933 is Exceeds;
  - Mandip (exact 9.00) is ordered above Sajjan (8.9956);
  - a competition-ranking tie (1, 2, 2, 4);
  - the `5.975` cell becomes 598 with a PRECISION_ROUNDED warning;
  - a RUN-only row;
  - a single-sprint engineer.

## Notes
- The reference algorithm computes `prior3` whenever there are ≥ 4 scored sprints (the average of up to 3 earlier scores), but `momentum` only with ≥ 6. E-04-01 matches this.
- The fixtures contain real names and scores, so the repository must stay private.

## Acceptance criteria status
- [x] AC-1: satisfied — `expected-workbook.json` has every per-employee field plus the Performance Insights figures; asserted for counts, completeness and window.
- [x] AC-2: satisfied — `reference-s122-s135.json` has all listed metrics; a test asserts `rank` is absent.
- [x] AC-3: satisfied — tests regenerate both files from the sources and deep-compare them with the committed JSON.
- [x] AC-4: satisfied — `boundary-cases.json` covers all five required cases (plus the tie case); a test checks they are present, and that Mandip ranks above Sajjan and E44 = 5.975 in the workbook.

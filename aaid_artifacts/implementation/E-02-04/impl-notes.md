# E-02-04 — Identity matching & diff engine · Implementation record

## Files
- `src/domain/import/diff.ts` (`diffImport`): a pure function over a `ParsedMasterSheet` and a `CurrentState`.
- `src/domain/shared/edit-distance.ts`: Levenshtein with early exit.
- Tests: `tests/unit/domain/import/diff.test.ts`.

## Matching order
1. Employee code (when the sheet has a Code column).
2. Exact normalised alias (ADR-018 namespace).
3. An HR-confirmed near-duplicate merge (adds the file spelling as an alias at commit).

Otherwise the row is a new employee, flagged `NEAR_DUPLICATE` when it is within edit distance 2 of any alias.

## Acceptance criteria status
- [x] AC-1: satisfied — alias matches are case- and whitespace-insensitive ("NIVA AWALE" → existing "Niva  Awale").
- [x] AC-2: satisfied — near-duplicates are listed for confirmation; unconfirmed ones are created as new.
- [x] AC-3: satisfied — teams and designations resolve via TeamAlias/DesignationAlias ("RUN" → Run Team); unknown names are listed as new.
- [x] AC-4: satisfied — the summary reports new / matched / attribute changes / new sprints / scores added, changed and unchanged / not-in-file, plus `LOCKED_FIELD_DIFFERS` warnings; counts are consistent in the tests.
- [x] AC-5: satisfied — a name matching more than one employee gives an `AMBIGUOUS_NAME` error (resolved when a Code column is present).

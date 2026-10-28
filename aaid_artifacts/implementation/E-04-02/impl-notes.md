# E-04-02 — Rating bands · Implementation record

## Files
`src/domain/kpi/bands.ts` (`bandFor`, `validateBands`); defaults in `src/domain/settings/defaults.ts`.

## Acceptance criteria status
- [x] AC-1: satisfied — 8.00 → Outstanding, 7.99 / 6.00 → Exceeds, 5.99 / 5.00 → Meets, 4.99 → Needs Improvement, no scores → N/A.
- [x] AC-2: satisfied — the band is computed on the 2-dp half-up average, so an exact 7.995 is banded Outstanding and 7.9933 is Exceeds (boundary fixtures).
- [x] AC-3: satisfied — `validateBands` rejects wrong key order, minimums outside 0–10, non-descending minimums and blank labels.

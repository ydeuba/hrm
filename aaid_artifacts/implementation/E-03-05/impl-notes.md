# E-03-05 — Correct a single score · Implementation record

## Implementation
- Domain `kpi/score-correction.ts`; CorrectScore use case; `PUT /api/v1/employees/{id}/scores/{sprint}`; inline Edit in the profile score table (`components/employees/score-row.tsx`).

## Acceptance criteria status
- [x] AC-1: satisfied — accepts 0–10 (half-up to centi), RUN or N/A with a 3–500 character reason; SCORE_CORRECT is audited with before/after and the reason.
- [x] AC-2: satisfied — an out-of-range value returns 422 OUT_OF_RANGE (shown inline in the UI).
- [x] AC-3: satisfied — the revision moves, so the earlier import shows canRollback=false.

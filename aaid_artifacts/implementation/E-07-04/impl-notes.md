# E-07-04 — Individual appraisal summary print · Implementation record

## Implementation
- `src/app/(print)/print/employees/[id]/page.tsx`, `components/print/appraisal-summary.tsx` and `auto-print.tsx`; `.appraisal-page` print CSS.
- Tests: `tests/e2e/people.spec.ts` (E-07-04), which also records `test-results/print-appraisal.png`.

## Acceptance criteria status
- [x] AC-1: satisfied — one A4 page with profile stats, the trend chart, overall and designation rank, rating and sprint range (screenshot checked).
- [x] AC-2: satisfied — the footer reads "Cloudtech Services · Confidential" with the generated time (Asia/Kathmandu).

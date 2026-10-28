# E-07-01 — Print dashboard to PDF · Implementation record

## Implementation
- Route `src/app/(print)/print/dashboard/page.tsx` with a `(print)` layout (requireSession, no app shell); `components/print/print-dashboard.tsx`; print CSS in `globals.css` (@page A4, break-inside: avoid, print-color-adjust: exact).
- Header and footer are the <thead>/<tfoot> of a wrapping table, which Chromium repeats on every printed page.
- Tests: `tests/e2e/kpi-dashboard.spec.ts` (E-07-01) also writes `test-results/print-dashboard.pdf` and `.png` as the recorded print check.

## Acceptance criteria status
- [x] AC-1: satisfied — "Print / PDF" opens /print/dashboard?<current filters> in a new tab; the dialog opens automatically (`autoprint=0` disables it for tests); there is no navigation and no filter bar.
- [x] AC-2: satisfied — A4 @page; panels use break-inside: avoid; the repeating header shows range, filters and generated time; footer "Cloudtech Services · Confidential".
- [x] AC-3: satisfied — band pills always carry text labels, and momentum uses ▲/▼ signs.

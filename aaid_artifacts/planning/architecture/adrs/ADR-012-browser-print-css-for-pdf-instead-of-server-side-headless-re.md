# ADR-012: Browser print CSS for PDF instead of server-side headless rendering

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: US-07-01/03 need PDFs of the dashboard and of each engineer. Running locally on Windows, a headless Chromium (Puppeteer) adds about 150 MB and makes deployment fragile.
- **Decision**: Dedicated print routes `/print/dashboard?…` and `/print/employees/[id]` (plus `/print/teams/[id]` for a batch print) with `@media print` CSS: A4, `break-inside: avoid`, a header showing filters, range and timestamp, and a "Cloudtech Services · Confidential" footer. The user saves as PDF through the browser's print dialog. Charts are drawn with `animation:false` and a fixed `devicePixelRatio: 2` for crisp output.
- **Consequences**: No extra dependencies, and the output is the same as on screen. PDF creation is manual (the print dialog), and automated or emailed PDFs are deferred. Server-side rendering can be added later as a `PdfRenderer` port.

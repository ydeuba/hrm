# ADR-010: Chart.js and Tailwind CSS with design tokens from the reference report

_Source of truth: [architecture.md](../architecture.md) — extracted 2026-10-15._

- **Status**: Accepted
- **Context**: Management already knows the look of `Cloudtech_KPI_Dashboard_S122-S135.html` (NFR-26). Accessibility rules: never convey meaning by colour alone, provide table alternatives (NFR-24).
- **Decision**: Use `chart.js` 4.x with `react-chartjs-2`, registering only the controllers we use (tree-shaken). Tailwind CSS v4 with CSS variables `--navy #10233F`, `--teal #0F6E78`, `--teal2 #13909c`, `--green #1E8E4E`, `--amber #C8881A`, `--red #C0392B`. Charts load client-side only (`dynamic(..., {ssr:false})`). Each chart has a visually hidden `<table>` alternative and an `aria-describedby` summary. Rejected alternatives: Recharts (a different look from the reference) and ECharts (heavier).
- **Consequences**: Visual continuity, and a small bundle (Chart.js is about 70 KB gzipped when tree-shaken). Canvas charts print correctly at the `beforeprint` resize.

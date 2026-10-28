import type { DashboardCards } from '@/domain/kpi/dashboard';
import type { BandOrNone } from '@/domain/kpi/bands';
import { bandFor } from '@/domain/kpi/bands';
import type { BandDef } from '@/domain/settings/kpi-settings';
import { fmt2, formatPercent } from '@/components/format';

const ACCENT: Record<BandOrNone, string> = {
  out: 'border-l-band-out', exc: 'border-l-band-exc', meet: 'border-l-band-meet', ni: 'border-l-band-ni', na: 'border-l-teal',
};

function Card({ label, value, detail, band }: { label: string; value: string; detail: string; band: BandOrNone }) {
  return (
    <div className={`rounded-xl border border-line border-l-4 bg-surface px-4 py-3 ${ACCENT[band]}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className="tabular mt-1 text-[26px] font-extrabold leading-none text-navy">{value}</div>
      <div className="mt-1 text-[11px] text-muted">{detail}</div>
    </div>
  );
}

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const FALLBACK: Record<BandDef['key'], BandDef> = {
  out: { key: 'out', label: 'Outstanding', min: 8 },
  exc: { key: 'exc', label: 'Exceeds', min: 6 },
  meet: { key: 'meet', label: 'Meets', min: 5 },
  ni: { key: 'ni', label: 'Needs Improvement', min: 0 },
};

function bandCards(cards: DashboardCards, bands: readonly BandDef[]) {
  const def = (key: BandDef['key']) => bands.find((x) => x.key === key) ?? FALLBACK[key];
  const n = cards.engineers;
  const b = cards.bands;
  const count = (v: number) => `${v} (${pct(v, n)}%)`;
  return [
    { label: def('out').label, value: count(b.out), detail: `≥ ${def('out').min.toFixed(2)}`, band: 'out' as const },
    { label: `${def('exc').label} or better`, value: count(b.out + b.exc), detail: `≥ ${def('exc').min.toFixed(2)}`, band: 'exc' as const },
    { label: def('meet').label, value: count(b.meet), detail: `≥ ${def('meet').min.toFixed(2)}`, band: 'meet' as const },
    { label: def('ni').label, value: count(b.ni), detail: `< ${def('meet').min.toFixed(2)}`, band: b.ni ? ('ni' as const) : ('out' as const) },
  ];
}

/** Headline KPI cards (US-05-01); each accent follows its band and is labelled in text. */
export function StatCards({ cards, bands }: Readonly<{ cards: DashboardCards; bands: readonly BandDef[] }>) {
  const avgBand = (v: number | null) => bandFor(v === null ? null : Math.round(v * 100) / 100, bands);
  const sprint = cards.latestSprint ?? 'Latest sprint';
  const items = [
    { label: 'Engineers', value: String(cards.engineers), detail: 'in current view', band: 'na' as const },
    { label: 'Org average', value: fmt2(cards.orgAverage), detail: 'weighted, out of 10', band: avgBand(cards.orgAverage) },
    { label: `${sprint} average`, value: fmt2(cards.latestAverage), detail: `${cards.latestParticipants} scored`, band: avgBand(cards.latestAverage) },
    { label: 'Coverage', value: formatPercent(cards.latestCoverage), detail: sprint, band: 'na' as const },
    ...bandCards(cards, bands),
  ];
  return (
    <section aria-label="Key figures" className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
      {items.map((i) => <Card key={i.label} {...i} />)}
    </section>
  );
}

import type { BandOrNone } from '@/domain/kpi/bands';
import type { BandDef } from '@/domain/settings/kpi-settings';

const PILL: Record<BandOrNone, string> = {
  out: 'bg-band-out text-white',
  exc: 'bg-band-exc text-white',
  meet: 'bg-band-meet text-white',
  ni: 'bg-band-ni text-white',
  na: 'bg-ltbg text-muted',
};

export function bandLabel(band: BandOrNone, bands: readonly BandDef[]): string {
  return band === 'na' ? 'N/A' : (bands.find((b) => b.key === band)?.label ?? band);
}

/** Rating pill — colour plus text, never colour alone (NFR-24). */
export function BandPill({ band, bands }: Readonly<{ band: BandOrNone; bands: readonly BandDef[] }>) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PILL[band]}`}>{bandLabel(band, bands)}</span>;
}

/** Momentum delta: ▲/▼ plus signed value. */
export function DeltaText({ value }: Readonly<{ value: number | null }>) {
  if (value === null) return <span className="text-muted">—</span>;
  if (value > 0.005) return <span className="font-bold text-band-out">▲ +{value.toFixed(2)}</span>;
  if (value < -0.005) return <span className="font-bold text-band-ni">▼ {value.toFixed(2)}</span>;
  return <span className="text-muted">– 0.00</span>;
}

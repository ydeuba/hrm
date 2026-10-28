/** Display formatting shared by pages and print views (NFR-30/31). */
const TIME_ZONE = 'Asia/Kathmandu';

const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIME_ZONE,
});

/** "13 Nov 2026, 14:05" in Asia/Kathmandu. */
export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return dateTime.format(typeof iso === 'string' ? new Date(iso) : iso);
}

/** Two decimals, or an em dash for missing values. */
export function fmt2(n: number | null | undefined): string {
  return n === null || n === undefined || Number.isNaN(n) ? '—' : n.toFixed(2);
}

export function formatPercent(fraction: number | null | undefined, digits = 1): string {
  return fraction === null || fraction === undefined ? '—' : `${(fraction * 100).toFixed(digits)}%`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

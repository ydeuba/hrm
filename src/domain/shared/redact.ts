import { normaliseName } from './name';

export const ERASED = '[erased]';

/** Needles compared against normalised text; blank needles are dropped so they can't match everything. */
export function erasureNeedles(values: readonly string[]): string[] {
  return [...new Set(values.map(normaliseName).filter((n) => n.length > 0))];
}

/** True when the text mentions any needle (case- and whitespace-insensitive). */
export function mentions(text: string, needles: readonly string[]): boolean {
  const hay = normaliseName(text);
  return needles.some((n) => hay.includes(n));
}

/**
 * Replace every string (value or key) that mentions a needle with "[erased]"
 * (ADR-017 step 2). Numbers and booleans are kept; structure is preserved.
 */
export function redactJson(value: unknown, needles: readonly string[]): unknown {
  if (typeof value === 'string') return mentions(value, needles) ? ERASED : value;
  if (Array.isArray(value)) return value.map((v) => redactJson(v, needles));
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [mentions(k, needles) ? ERASED : k, redactJson(v, needles)]));
}

/** Cheap pre-check before rewriting a stored JSON column. */
export function jsonMentions(value: unknown, needles: readonly string[]): boolean {
  return value !== null && value !== undefined && mentions(JSON.stringify(value), needles);
}

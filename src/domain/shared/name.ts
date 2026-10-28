/**
 * Name canonicalisation used for identity matching of employees, teams and
 * designations (ADR-018). Example: "Niva  Awale" → "niva awale".
 */
export function normaliseName(raw: string): string {
  return displayName(raw).toLowerCase();
}

/** Trim and collapse internal whitespace, keeping the original casing. */
export function displayName(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

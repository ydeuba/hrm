/**
 * Levenshtein distance with an early exit once every cell in a row exceeds
 * `max` — cheap enough to compare every file name against every alias.
 */
export function editDistanceWithin(a: string, b: string, max: number): number | null {
  if (Math.abs(a.length - b.length) > max) return null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row.push(Math.min((prev[j] as number) + 1, (row[j - 1] as number) + 1, (prev[j - 1] as number) + cost));
    }
    if (Math.min(...row) > max) return null;
    prev = row;
  }
  const d = prev[b.length] as number;
  return d <= max ? d : null;
}

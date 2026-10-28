/** Tooltip title: the sprint's calendar period when it has dates, else its code (US-03-07 AC-2). */
export function periodTitle(items: readonly { label: string }[], periods: Readonly<Record<string, string>>): string {
  const label = items[0]?.label ?? '';
  return periods[label] ?? label;
}

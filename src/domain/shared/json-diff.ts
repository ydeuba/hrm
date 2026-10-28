export interface FieldChange {
  readonly path: string;
  readonly before: unknown;
  readonly after: unknown;
}

const isContainer = (v: unknown): v is Record<string, unknown> | unknown[] => typeof v === 'object' && v !== null;
const entriesOf = (v: Record<string, unknown> | unknown[]) => (Array.isArray(v) ? v.map((x, i) => [String(i), x] as const) : Object.entries(v));

/** Flatten nested objects/arrays to dotted leaf paths ("bands.0.min"). */
export function flatten(value: unknown, prefix = '', out: Map<string, unknown> = new Map()): Map<string, unknown> {
  if (!isContainer(value)) {
    if (prefix || value !== undefined) out.set(prefix, value);
    return out;
  }
  const entries = entriesOf(value);
  if (entries.length === 0 && prefix) out.set(prefix, value);
  for (const [k, v] of entries) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Leaf-level before/after differences for the audit viewer (US-09-02 AC-2), in path order. */
export function diffJson(before: unknown, after: unknown): FieldChange[] {
  const a = flatten(before);
  const b = flatten(after);
  const paths = [...new Set([...a.keys(), ...b.keys()])].sort((x, y) => x.localeCompare(y, 'en', { numeric: true }));
  return paths.filter((p) => !same(a.get(p), b.get(p))).map((path) => ({ path, before: a.get(path), after: b.get(path) }));
}

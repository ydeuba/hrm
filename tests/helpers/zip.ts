/**
 * Minimal "stored" (uncompressed) ZIP writer for tests. `declaredSize` lets a
 * test lie about an entry's uncompressed size to simulate a zip bomb.
 */
export interface ZipEntrySpec {
  readonly name: string;
  readonly data?: Uint8Array;
  readonly declaredSize?: number;
}

const enc = new TextEncoder();

function header(size: number): { buf: Uint8Array; view: DataView } {
  const buf = new Uint8Array(size);
  return { buf, view: new DataView(buf.buffer) };
}

export function buildZip(entries: readonly ZipEntrySpec[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const data = e.data ?? new Uint8Array();
    const local = header(30 + name.length);
    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint32(18, data.length, true);
    local.view.setUint32(22, data.length, true);
    local.view.setUint16(26, name.length, true);
    local.buf.set(name, 30);
    const central = header(46 + name.length);
    central.view.setUint32(0, 0x02014b50, true);
    central.view.setUint32(20, data.length, true);
    central.view.setUint32(24, e.declaredSize ?? data.length, true);
    central.view.setUint16(28, name.length, true);
    central.view.setUint32(42, offset, true);
    central.buf.set(name, 46);
    locals.push(local.buf, data);
    centrals.push(central.buf);
    offset += local.buf.length + data.length;
  }
  const cdSize = centrals.reduce((a, c) => a + c.length, 0);
  const eocd = header(22);
  eocd.view.setUint32(0, 0x06054b50, true);
  eocd.view.setUint16(8, entries.length, true);
  eocd.view.setUint16(10, entries.length, true);
  eocd.view.setUint32(12, cdSize, true);
  eocd.view.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, eocd.buf];
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let p = 0;
  for (const part of parts) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}

export const MINIMAL_XLSX_PARTS: ZipEntrySpec[] = [
  { name: '[Content_Types].xml', data: enc.encode('<Types/>') },
  { name: 'xl/workbook.xml', data: enc.encode('<workbook/>') },
];

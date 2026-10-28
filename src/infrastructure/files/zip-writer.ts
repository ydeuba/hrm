import 'server-only';
import { crc32, deflateRawSync } from 'node:zlib';

export interface ZipEntry {
  readonly name: string;
  readonly bytes: Uint8Array;
}

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const END_SIG = 0x06054b50;
const DEFLATE = 8;
const UTF8_FLAG = 0x0800;
const VERSION = 20;

function block(size: number) {
  const buf = new Uint8Array(size);
  return { buf, view: new DataView(buf.buffer) };
}

/** MS-DOS date/time fields of a zip entry. */
function dosTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/**
 * Minimal deflate ZIP writer (PKZIP 2.0, no zip64 — entries and archive must
 * stay under 4 GiB, far above this app's data volume). Avoids a dependency for
 * the backup download (US-09-03).
 */
export function writeZip(entries: readonly ZipEntry[], modified: Date): Uint8Array {
  const { time, date } = dosTime(modified);
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const data = deflateRawSync(e.bytes);
    const crc = crc32(e.bytes);
    const local = block(30 + name.length);
    local.view.setUint32(0, LOCAL_SIG, true);
    local.view.setUint16(4, VERSION, true);
    local.view.setUint16(6, UTF8_FLAG, true);
    local.view.setUint16(8, DEFLATE, true);
    local.view.setUint16(10, time, true);
    local.view.setUint16(12, date, true);
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, data.length, true);
    local.view.setUint32(22, e.bytes.length, true);
    local.view.setUint16(26, name.length, true);
    local.buf.set(name, 30);
    const central = block(46 + name.length);
    central.view.setUint32(0, CENTRAL_SIG, true);
    central.view.setUint16(4, VERSION, true);
    central.view.setUint16(6, VERSION, true);
    central.view.setUint16(8, UTF8_FLAG, true);
    central.view.setUint16(10, DEFLATE, true);
    central.view.setUint16(12, time, true);
    central.view.setUint16(14, date, true);
    central.view.setUint32(16, crc, true);
    central.view.setUint32(20, data.length, true);
    central.view.setUint32(24, e.bytes.length, true);
    central.view.setUint16(28, name.length, true);
    central.view.setUint32(42, offset, true);
    central.buf.set(name, 46);
    locals.push(local.buf, data);
    centrals.push(central.buf);
    offset += local.buf.length + data.length;
  }
  const cd = concat(centrals);
  const end = block(22);
  end.view.setUint32(0, END_SIG, true);
  end.view.setUint16(8, entries.length, true);
  end.view.setUint16(10, entries.length, true);
  end.view.setUint32(12, cd.length, true);
  end.view.setUint32(16, offset, true);
  return concat([...locals, cd, end.buf]);
}

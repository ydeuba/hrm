import { err, ok, type Result } from '../shared/result';

/**
 * Reads a ZIP's central directory without decompressing anything, so an
 * upload can be rejected before the spreadsheet parser touches it (ADR-008
 * zip-bomb guard). Pure, works on any Uint8Array.
 */
export interface ZipSummary {
  readonly entries: number;
  readonly uncompressedBytes: number;
  readonly names: readonly string[];
}

export type ZipProblem = 'CORRUPT' | 'ZIP64';

const EOCD_SIG = 0x06054b50;
const CDH_SIG = 0x02014b50;
const EOCD_MIN = 22;
const MAX_COMMENT = 0xffff;

// Callers bound-check every offset, so the indexed reads are always defined.
const u16 = (b: Uint8Array, o: number) => (b[o] as number) | ((b[o + 1] as number) << 8);
const u32 = (b: Uint8Array, o: number) => (u16(b, o) | (u16(b, o + 2) << 16)) >>> 0;

function findEocd(b: Uint8Array): number {
  const stop = Math.max(0, b.length - EOCD_MIN - MAX_COMMENT);
  for (let i = b.length - EOCD_MIN; i >= stop; i--) {
    if (u32(b, i) === EOCD_SIG) return i;
  }
  return -1;
}

function readEntries(b: Uint8Array, offset: number, count: number): Result<ZipSummary, ZipProblem> {
  const names: string[] = [];
  let total = 0;
  let p = offset;
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (p + 46 > b.length || u32(b, p) !== CDH_SIG) return err('CORRUPT');
    const size = u32(b, p + 24);
    if (size === 0xffffffff) return err('ZIP64');
    const nameLen = u16(b, p + 28);
    names.push(decoder.decode(b.subarray(p + 46, p + 46 + nameLen)));
    total += size;
    p += 46 + nameLen + u16(b, p + 30) + u16(b, p + 32);
  }
  return ok({ entries: count, uncompressedBytes: total, names });
}

export function inspectZip(bytes: Uint8Array): Result<ZipSummary, ZipProblem> {
  const eocd = findEocd(bytes);
  if (eocd < 0) return err('CORRUPT');
  const count = u16(bytes, eocd + 10);
  const cdOffset = u32(bytes, eocd + 16);
  if (count === 0xffff || cdOffset === 0xffffffff) return err('ZIP64');
  if (cdOffset >= bytes.length) return err('CORRUPT');
  return readEntries(bytes, cdOffset, count);
}

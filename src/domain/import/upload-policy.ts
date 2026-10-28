import { err, ok, type Result } from '../shared/result';
import { inspectZip } from './zip-inspector';

/**
 * Upload acceptance rules (US-02-01, ADR-008): only .xlsx or .csv, within the
 * size limit, with a matching file signature; no macro-enabled, encrypted or
 * legacy workbooks; no ZIP that would expand beyond the uncompressed limit.
 */
export interface UploadLimits {
  readonly maxBytes: number;
  readonly maxUncompressedBytes: number;
  readonly maxZipEntries: number;
}

export type UploadKind = 'xlsx' | 'csv';

export interface UploadRejection {
  readonly code: 'IMPORT_TOO_LARGE' | 'IMPORT_INVALID_FILE';
  readonly reason: string;
}

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

const startsWith = (b: Uint8Array, magic: readonly number[]) => magic.every((m, i) => b[i] === m);
const reject = (reason: string): Result<UploadKind, UploadRejection> => err({ code: 'IMPORT_INVALID_FILE', reason });

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

function checkWorkbook(bytes: Uint8Array, limits: UploadLimits): Result<UploadKind, UploadRejection> {
  if (startsWith(bytes, CFB_MAGIC)) return reject('Password-protected or legacy .xls workbooks are not supported — save as an unprotected .xlsx.');
  if (!startsWith(bytes, ZIP_MAGIC)) return reject('The file is not a valid .xlsx workbook.');
  const zip = inspectZip(bytes);
  if (!zip.ok) return reject(zip.error === 'ZIP64' ? 'The workbook is too large to process.' : 'The workbook is damaged and cannot be read.');
  if (zip.value.entries > limits.maxZipEntries) return reject('The workbook contains too many parts to process safely.');
  if (zip.value.uncompressedBytes > limits.maxUncompressedBytes) return reject('The workbook expands beyond the allowed size.');
  if (!zip.value.names.includes('[Content_Types].xml')) return reject('The file is not a valid .xlsx workbook.');
  if (zip.value.names.some((n) => /vbaProject\.bin$/i.test(n))) return reject('Macro-enabled workbooks are not accepted — save as a plain .xlsx.');
  return ok('xlsx');
}

function checkCsv(bytes: Uint8Array): Result<UploadKind, UploadRejection> {
  if (bytes.includes(0)) return reject('The CSV file contains binary data.');
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return reject('The CSV file must be UTF-8 encoded.');
  }
  return ok('csv');
}

export function validateUpload(fileName: string, bytes: Uint8Array, limits: UploadLimits): Result<UploadKind, UploadRejection> {
  if (bytes.length > limits.maxBytes) {
    return err({ code: 'IMPORT_TOO_LARGE', reason: `The file is larger than ${Math.round(limits.maxBytes / 1048576)} MB.` });
  }
  if (bytes.length === 0) return reject('The file is empty.');
  const ext = extensionOf(fileName);
  if (ext === 'xlsm') return reject('Macro-enabled workbooks (.xlsm) are not accepted — save as a plain .xlsx.');
  if (ext === 'xlsx') return checkWorkbook(bytes, limits);
  if (ext === 'csv') return checkCsv(bytes);
  return reject('Only .xlsx and .csv files are accepted.');
}

import 'server-only';
import { HttpError } from './http-errors';

/** Headroom for the multipart envelope (boundaries, part headers) around the file itself. */
const MULTIPART_OVERHEAD = 64 * 1024;

const tooLarge = (maxBytes: number) =>
  new HttpError(413, 'IMPORT_TOO_LARGE', `The file is larger than ${Math.round(maxBytes / 1048576)} MB.`);

/**
 * Read a multipart upload with a hard byte limit (ADR-008): rejected from
 * Content-Length before the body is read, and counted while streaming in case
 * the header is missing or wrong. Route Handlers have no built-in limit.
 */
export async function readUploadedFile(req: Request, maxBytes: number, field = 'file'): Promise<{ fileName: string; bytes: Uint8Array }> {
  const limit = maxBytes + MULTIPART_OVERHEAD;
  const declared = Number(req.headers.get('content-length') ?? NaN);
  if (Number.isFinite(declared) && declared > limit) throw tooLarge(maxBytes);

  const body = await readLimited(req, limit, maxBytes);
  const form = await new Request(req.url, { method: 'POST', headers: req.headers, body: body as BodyInit }).formData().catch(() => {
    throw new HttpError(400, 'IMPORT_INVALID_FILE', 'Expected a multipart/form-data upload.');
  });
  const file = form.get(field);
  if (!(file instanceof File)) throw new HttpError(400, 'IMPORT_INVALID_FILE', `Attach the spreadsheet in the "${field}" field.`);
  if (file.size > maxBytes) throw tooLarge(maxBytes);
  return { fileName: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}

async function readLimited(req: Request, limit: number, maxBytes: number): Promise<Uint8Array> {
  if (!req.body) throw new HttpError(400, 'IMPORT_INVALID_FILE', 'No file was uploaded.');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > limit) {
      // Stop consuming; releasing (not cancelling) avoids undici racing an enqueue into a cancelled stream.
      reader.releaseLock();
      throw tooLarge(maxBytes);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

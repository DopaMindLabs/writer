import { invariant } from '@/lib/invariant';
import { db } from '@/db/db';

export type FetchFailureReason =
  | 'invalid-url'
  | 'cors'
  | 'http'
  | 'network'
  | 'not-pdf'
  | 'too-large'
  | 'corrupt';

export type FetchResult =
  | { ok: true }
  | { ok: false; reason: FetchFailureReason; message: string };

export const MAX_PDF_BYTES = 50 * 1024 * 1024;

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] as const;

const isHttpsUrl = (url: string): boolean => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

const sniffPdfMagic = async (blob: Blob): Promise<boolean> => {
  const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (head.length < 4) return false;
  for (let i = 0; i < PDF_MAGIC.length; i += 1) {
    if (head[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
};

interface PdfDocLike {
  numPages: number;
  destroy: () => Promise<void>;
}

interface PdfjsLike {
  getDocument: (args: { data: ArrayBuffer }) => { promise: Promise<PdfDocLike> };
}

const countPages = async (blob: Blob): Promise<number> => {
  const mod = (await import('pdfjs-dist')) as unknown as PdfjsLike;
  const doc = await mod.getDocument({ data: await blob.arrayBuffer() }).promise;
  try {
    return doc.numPages;
  } finally {
    await doc.destroy();
  }
};

const fail = (reason: FetchFailureReason, message: string): FetchResult => ({
  ok: false,
  reason,
  message,
});

const doFetch = async (url: string): Promise<Response | FetchResult> => {
  try {
    return await fetch(url, { mode: 'cors', credentials: 'omit' });
  } catch {
    return fail('cors', 'The PDF host blocks cross-origin requests.');
  }
};

const validateBlob = async (blob: Blob): Promise<FetchResult | null> => {
  if (blob.size > MAX_PDF_BYTES) return fail('too-large', 'PDF exceeds 50 MB.');
  if (!(await sniffPdfMagic(blob)))
    return fail('not-pdf', 'URL did not return a PDF.');
  return null;
};

export const fetchAndCachePdf = async (
  noteId: string,
  url: string,
): Promise<FetchResult> => {
  invariant(noteId.length > 0, 'fetchAndCachePdf: noteId required');
  if (!isHttpsUrl(url)) return fail('invalid-url', 'Enter an https:// URL.');

  const response = await doFetch(url);
  if (!(response instanceof Response)) return response;
  if (!response.ok)
    return fail('http', `Server returned ${String(response.status)}.`);

  const blob = await response.blob();
  const invalid = await validateBlob(blob);
  if (invalid) return invalid;

  let pageCount: number;
  try {
    pageCount = await countPages(blob);
  } catch {
    return fail('corrupt', 'PDF could not be opened.');
  }

  await db.noteUrlCache.put({
    noteId,
    url,
    mime: 'application/pdf',
    size: blob.size,
    blob,
    pageCount,
    fetchedAt: Date.now(),
  });

  return { ok: true };
};

export const invalidateUrlCache = (noteId: string): Promise<void> =>
  db.noteUrlCache.delete(noteId);

export const filenameFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    if (last && last.length > 0) return decodeURIComponent(last);
    return parsed.hostname;
  } catch {
    return url;
  }
};

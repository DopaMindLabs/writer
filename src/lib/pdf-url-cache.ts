import { invariant } from '@/lib/invariant';
import { db } from '@/db/db';
import { isDomainAllowed } from '@/lib/trusted-domains';
import { MAX_PDF_BYTES, countPages, sniffPdfMagic } from '@/lib/pdf-blob';

export { MAX_PDF_BYTES };

export type FetchFailureReason =
  | 'invalid-url'
  | 'untrusted-domain'
  | 'cors'
  | 'http'
  | 'network'
  | 'not-pdf'
  | 'too-large'
  | 'corrupt';

export type FetchResult =
  | { ok: true }
  | { ok: false; reason: FetchFailureReason; message: string };

const isHttpsUrl = (url: string): boolean => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

const fail = (reason: FetchFailureReason, message: string): FetchResult => ({
  ok: false,
  reason,
  message,
});

interface ResponseLike {
  ok: boolean;
  status: number;
  blob: () => Promise<Blob>;
}

type FetchOutcome =
  | { ok: true; response: ResponseLike }
  | { ok: false; result: FetchResult };

const doFetch = async (url: string): Promise<FetchOutcome> => {
  try {
    const response = (await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    })) as ResponseLike;
    return { ok: true, response };
  } catch {
    return {
      ok: false,
      result: fail('cors', 'The PDF host blocks cross-origin requests.'),
    };
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
  if (!(await isDomainAllowed(url)))
    return fail('untrusted-domain', 'This domain is not in your trusted list.');

  const fetched = await doFetch(url);
  if (!fetched.ok) return fetched.result;
  const { response } = fetched;
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

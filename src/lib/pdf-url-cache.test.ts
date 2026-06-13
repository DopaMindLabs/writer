import { vi } from 'vitest';
import { db } from '@/db/db';
import {
  fetchAndCachePdf,
  filenameFromUrl,
  invalidateUrlCache,
  MAX_PDF_BYTES,
} from './pdf-url-cache';

const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

const pdfBlob = (body = PDF_HEADER): Blob =>
  new Blob([body], { type: 'application/pdf' });

const respondWith = (
  body: BodyInit,
  init: ResponseInit = {},
): Response => new Response(body, init);

const mockFetchOnce = (response: Response | (() => Response | Promise<Response>)) => {
  const impl = typeof response === 'function' ? response : () => response;
  const spy = vi.fn(impl as () => Promise<Response>);
  vi.stubGlobal('fetch', spy);
  return spy;
};

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({ numPages: 8 }),
    destroy: () => Promise.resolve(),
  })),
}));

describe('fetchAndCachePdf', () => {
  it('rejects non-https urls without hitting the network', async () => {
    const fetchSpy = mockFetchOnce(respondWith(''));
    const result = await fetchAndCachePdf('n1', 'http://example.com/x.pdf');
    expect(result).toEqual({
      ok: false,
      reason: 'invalid-url',
      message: 'Enter an https:// URL.',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('caches a successful PDF fetch with page count and metadata', async () => {
    mockFetchOnce(respondWith(pdfBlob()));
    const result = await fetchAndCachePdf('n1', 'https://example.com/paper.pdf');
    expect(result).toEqual({ ok: true });
    const cached = await db.noteUrlCache.get('n1');
    expect(cached?.url).toBe('https://example.com/paper.pdf');
    expect(cached?.mime).toBe('application/pdf');
    expect(cached?.pageCount).toBe(8);
    expect(cached?.blob).toBeInstanceOf(Blob);
  });

  it('returns a cors failure when fetch throws', async () => {
    mockFetchOnce(() => {
      throw new TypeError('blocked by CORS');
    });
    const result = await fetchAndCachePdf('n1', 'https://example.com/x.pdf');
    expect(result).toEqual({
      ok: false,
      reason: 'cors',
      message: 'The PDF host blocks cross-origin requests.',
    });
    expect(await db.noteUrlCache.get('n1')).toBeUndefined();
  });

  it('returns http failure for non-2xx responses', async () => {
    mockFetchOnce(respondWith('not found', { status: 404 }));
    const result = await fetchAndCachePdf('n1', 'https://example.com/x.pdf');
    expect(result).toEqual({
      ok: false,
      reason: 'http',
      message: 'Server returned 404.',
    });
    expect(await db.noteUrlCache.get('n1')).toBeUndefined();
  });

  it('rejects bodies that are not PDFs by magic-byte sniff', async () => {
    mockFetchOnce(respondWith('<!doctype html><html>not a pdf</html>'));
    const result = await fetchAndCachePdf('n1', 'https://example.com/x.pdf');
    expect(result).toEqual({
      ok: false,
      reason: 'not-pdf',
      message: 'URL did not return a PDF.',
    });
  });

  it('rejects bodies that exceed the size limit', async () => {
    const huge = pdfBlob();
    Object.defineProperty(huge, 'size', { value: MAX_PDF_BYTES + 1 });
    const fakeResponse = {
      ok: true,
      status: 200,
      blob: () => Promise.resolve(huge),
    } as unknown as Response;
    mockFetchOnce(fakeResponse);
    const result = await fetchAndCachePdf('n1', 'https://example.com/x.pdf');
    expect(result).toEqual({
      ok: false,
      reason: 'too-large',
      message: 'PDF exceeds 50 MB.',
    });
  });

  it('replaces a previous cache row on a re-fetch for the same note', async () => {
    mockFetchOnce(respondWith(pdfBlob()));
    await fetchAndCachePdf('n1', 'https://a.example.com/a.pdf');
    mockFetchOnce(respondWith(pdfBlob()));
    await fetchAndCachePdf('n1', 'https://b.example.com/b.pdf');
    const all = await db.noteUrlCache.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]?.url).toBe('https://b.example.com/b.pdf');
  });
});

describe('invalidateUrlCache', () => {
  it('removes the cache entry for the given note', async () => {
    mockFetchOnce(respondWith(pdfBlob()));
    await fetchAndCachePdf('n1', 'https://example.com/x.pdf');
    await invalidateUrlCache('n1');
    expect(await db.noteUrlCache.get('n1')).toBeUndefined();
  });
});

describe('filenameFromUrl', () => {
  it('returns the final path segment, url-decoded', () => {
    expect(filenameFromUrl('https://arxiv.org/pdf/1706.03762.pdf')).toBe(
      '1706.03762.pdf',
    );
    expect(filenameFromUrl('https://example.com/a/b/c%20d.pdf')).toBe('c d.pdf');
  });

  it('falls back to the hostname when no path segment is present', () => {
    expect(filenameFromUrl('https://example.com')).toBe('example.com');
  });

  it('returns the input verbatim when not a parseable url', () => {
    expect(filenameFromUrl('not a url')).toBe('not a url');
  });
});

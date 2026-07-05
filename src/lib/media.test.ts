import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock only the adapter seam so countPdfPages runs without real pdfjs (jsdom
// lacks DOMMatrix). Real pdfjs is exercised in the Stage C e2e specs.
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('@/lib/pdf/pdfAdapter', () => ({
  pdfjs: { getDocument, GlobalWorkerOptions: { workerSrc: '' } },
}));

import { db } from '@/db/db';
import { NoteKind, NoteState } from '@/db/schema';
import { PDF_MIME, MAX_PDF_BYTES } from '@/data/media';
import {
  validatePdfFile,
  addMediaItem,
  getMediaItem,
  listMediaBySpace,
  deleteMediaCascade,
} from './media';

const PDF_HEAD = [0x25, 0x50, 0x44, 0x46, 1, 2, 3];

const pdfFile = (bytes: number[] = PDF_HEAD): File =>
  new File([new Uint8Array(bytes)], 'doc.pdf', { type: PDF_MIME });

const pdfBlob = (): Blob => new Blob([new Uint8Array(PDF_HEAD)], { type: PDF_MIME });

const mockPages = (numPages: number): void => {
  getDocument.mockReturnValue({
    promise: Promise.resolve({ numPages }),
    destroy: vi.fn().mockResolvedValue(undefined),
  });
};

beforeEach(async () => {
  getDocument.mockReset();
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('validatePdfFile', () => {
  it('rejects a non-pdf mime', async () => {
    const file = new File([new Uint8Array([1])], 'x.txt', { type: 'text/plain' });
    expect(await validatePdfFile(file)).toEqual({ ok: false, reason: 'mime' });
  });

  it('rejects a file over the size limit', async () => {
    const big = {
      type: PDF_MIME,
      size: MAX_PDF_BYTES + 1,
      arrayBuffer: async () => new Uint8Array(PDF_HEAD).buffer,
    } as unknown as File;
    expect(await validatePdfFile(big)).toEqual({ ok: false, reason: 'size' });
  });

  it('rejects a file without the %PDF magic', async () => {
    expect(await validatePdfFile(pdfFile([0, 1, 2, 3]))).toEqual({
      ok: false,
      reason: 'not-pdf',
    });
  });

  it('rejects a corrupt pdf that cannot be parsed', async () => {
    getDocument.mockReturnValue({
      promise: Promise.reject(new Error('bad')),
      destroy: vi.fn().mockResolvedValue(undefined),
    });
    expect(await validatePdfFile(pdfFile())).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('accepts a valid pdf', async () => {
    mockPages(1);
    expect(await validatePdfFile(pdfFile())).toEqual({ ok: true });
  });
});

describe('media facade', () => {
  it('addMediaItem stores blob, size and page count', async () => {
    mockPages(4);
    const blob = pdfBlob();
    const item = await addMediaItem({ spaceId: 's1', name: 'Paper.pdf', blob });
    expect(item.pageCount).toBe(4);
    expect(item.size).toBe(blob.size);
    expect(item.mime).toBe(PDF_MIME);
    expect(await getMediaItem(item.id)).toBeDefined();
  });

  it('listMediaBySpace returns newest first', async () => {
    mockPages(1);
    await db.media.bulkAdd([
      { id: 'older', spaceId: 's1', name: 'a.pdf', mime: PDF_MIME, size: 1, pageCount: 1, blob: pdfBlob(), createdAt: 10, updatedAt: 10 },
      { id: 'newer', spaceId: 's1', name: 'b.pdf', mime: PDF_MIME, size: 1, pageCount: 1, blob: pdfBlob(), createdAt: 20, updatedAt: 20 },
      { id: 'other', spaceId: 's2', name: 'c.pdf', mime: PDF_MIME, size: 1, pageCount: 1, blob: pdfBlob(), createdAt: 30, updatedAt: 30 },
    ]);
    const list = await listMediaBySpace('s1');
    expect(list.map((m) => m.id)).toEqual(['newer', 'older']);
  });

  it('deleteMediaCascade removes the item and highlights and detaches notes', async () => {
    mockPages(1);
    const item = await addMediaItem({ spaceId: 's1', name: 'a.pdf', blob: pdfBlob() });
    await db.pdfAnnotations.add({
      id: 'h1', mediaId: item.id, spaceId: 's1', kind: 'highlight', page: 1,
      rects: [{ x: 0, y: 0, w: 0.1, h: 0.1 }], quote: 'q', color: 'yellow',
      author: 'me', createdAt: 1, updatedAt: 1,
    });
    await db.notes.add({
      id: 'n1', spaceId: 's1', l: 0, t: 0, w: 1, h: 1,
      kind: NoteKind.Source, state: NoteState.User, body: '', createdAt: 1,
      mediaId: item.id,
    });

    await deleteMediaCascade(item.id);

    expect(await getMediaItem(item.id)).toBeUndefined();
    expect(await db.pdfAnnotations.get('h1')).toBeUndefined();
    expect((await db.notes.get('n1'))?.mediaId).toBeUndefined();
  });
});

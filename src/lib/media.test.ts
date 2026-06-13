import { vi } from 'vitest';
import { getDocument } from 'pdfjs-dist';
import { db } from '@/db/db';
import type { Note } from '@/db/schema';
import { NoteKind, NoteState } from '@/db/schema';
import {
  addMediaItem,
  deleteMediaItem,
  getMediaBySpace,
  getMediaItem,
  validatePdfFile,
} from './media';

const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn((args: { data: ArrayBuffer }) => {
    const head = new Uint8Array(args.data.slice(0, 4));
    const isPdf = head[0] === 0x25 && head[1] === 0x50;
    return {
      promise: isPdf
        ? Promise.resolve({ numPages: 5, destroy: () => Promise.resolve() })
        : Promise.reject(new Error('not a pdf')),
    };
  }),
}));

const pdfFile = (name = 'paper.pdf'): File =>
  new File([PDF_HEADER], name, { type: 'application/pdf' });

describe('validatePdfFile', () => {
  it('rejects a non-pdf mime type', async () => {
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });
    expect(await validatePdfFile(file)).toEqual({
      ok: false,
      reason: 'mime',
      message: 'Only PDF files are supported.',
    });
  });

  it('rejects a file larger than the limit', async () => {
    const file = pdfFile();
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 + 1 });
    expect(await validatePdfFile(file)).toEqual({
      ok: false,
      reason: 'size',
      message: 'PDF exceeds 50 MB.',
    });
  });

  it('rejects a file whose bytes are not a PDF', async () => {
    const file = new File(['<html>'], 'a.pdf', { type: 'application/pdf' });
    expect(await validatePdfFile(file)).toEqual({
      ok: false,
      reason: 'not-pdf',
      message: 'File is not a valid PDF.',
    });
  });

  it('accepts a valid PDF', async () => {
    expect(await validatePdfFile(pdfFile())).toEqual({ ok: true });
  });

  it('reports corrupt and logs when the PDF cannot be opened', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getDocument).mockImplementationOnce(
      () =>
        ({ promise: Promise.reject(new Error('broken')) }) as ReturnType<
          typeof getDocument
        >,
    );
    expect(await validatePdfFile(pdfFile())).toEqual({
      ok: false,
      reason: 'corrupt',
      message: 'PDF could not be opened.',
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('addMediaItem', () => {
  it('stores a media item with its page count and timestamps', async () => {
    const blob = new Blob([PDF_HEADER], { type: 'application/pdf' });
    const item = await addMediaItem('s1', 'paper.pdf', blob);
    expect(item.spaceId).toBe('s1');
    expect(item.name).toBe('paper.pdf');
    expect(item.mime).toBe('application/pdf');
    expect(item.pageCount).toBe(5);
    expect(item.createdAt).toBe(item.updatedAt);
    expect(await db.media.get(item.id)).toBeDefined();
  });
});

describe('getMediaBySpace', () => {
  it('returns a space media newest-first, scoped to the space', async () => {
    const blob = new Blob([PDF_HEADER], { type: 'application/pdf' });
    const first = await addMediaItem('s1', 'first.pdf', blob);
    const second = await addMediaItem('s1', 'second.pdf', blob);
    await db.media.update(first.id, { createdAt: 100 });
    await db.media.update(second.id, { createdAt: 200 });
    await addMediaItem('s2', 'other.pdf', blob);

    const items = await getMediaBySpace('s1');
    expect(items.map((m) => m.name)).toEqual(['second.pdf', 'first.pdf']);
  });
});

describe('getMediaItem', () => {
  it('returns the stored item by id', async () => {
    const blob = new Blob([PDF_HEADER], { type: 'application/pdf' });
    const item = await addMediaItem('s1', 'paper.pdf', blob);
    expect((await getMediaItem(item.id))?.name).toBe('paper.pdf');
  });
});

describe('deleteMediaItem', () => {
  const linkedNote = (mediaItemId: string): Note => ({
    id: 'n1',
    spaceId: 's1',
    l: 0,
    t: 0,
    w: 100,
    h: 60,
    kind: NoteKind.Pdf,
    state: NoteState.User,
    body: '',
    createdAt: 0,
    mediaItemId,
  });

  it('removes the item and clears mediaItemId on linked notes', async () => {
    const blob = new Blob([PDF_HEADER], { type: 'application/pdf' });
    const item = await addMediaItem('s1', 'paper.pdf', blob);
    await db.notes.add(linkedNote(item.id));

    await deleteMediaItem(item.id);

    expect(await db.media.get(item.id)).toBeUndefined();
    expect((await db.notes.get('n1'))?.mediaItemId).toBeUndefined();
  });

  it('leaves notes linked to other items untouched', async () => {
    const blob = new Blob([PDF_HEADER], { type: 'application/pdf' });
    const keep = await addMediaItem('s1', 'keep.pdf', blob);
    const drop = await addMediaItem('s1', 'drop.pdf', blob);
    await db.notes.add({ ...linkedNote(keep.id), id: 'n-keep' });

    await deleteMediaItem(drop.id);

    expect((await db.notes.get('n-keep'))?.mediaItemId).toBe(keep.id);
  });
});

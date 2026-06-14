import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { NoteKind, NoteState, type Note } from '@/db/schema';
import { useUI } from '@/store/ui';
import { addTrustedDomain } from '@/lib/trusted-domains';
import { useCardController } from './usePdfCardController';

const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({ numPages: 8 }),
    destroy: () => Promise.resolve(),
  })),
}));

const pdfResponse = (): Response =>
  new Response(new Blob([PDF_HEADER], { type: 'application/pdf' }));

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 'n1',
  spaceId: 's1',
  l: 0,
  t: 0,
  w: 1,
  h: 1,
  kind: NoteKind.Pdf,
  state: NoteState.User,
  body: '',
  createdAt: 0,
  ...overrides,
});

beforeEach(async () => {
  await addTrustedDomain('example.com');
  await db.notes.add(note());
});

describe('useCardController', () => {
  it('applies a URL selection: sets pdfUrl, clears mediaItemId, fetches', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(pdfResponse())));
    const { result } = renderHook(() => useCardController(note({ mediaItemId: 'old' })));

    await result.current.applySelection({
      kind: 'url',
      url: 'https://example.com/x.pdf',
    });

    await waitFor(async () => {
      const stored = await db.notes.get('n1');
      expect(stored?.pdfUrl).toBe('https://example.com/x.pdf');
      expect(stored?.mediaItemId).toBeUndefined();
    });
    expect(await db.noteUrlCache.get('n1')).toBeDefined();
  });

  it('applies a library selection: sets mediaItemId and clears pdfUrl', async () => {
    const { result } = renderHook(() =>
      useCardController(note({ pdfUrl: 'https://example.com/old.pdf' })),
    );

    await result.current.applySelection({ kind: 'library', mediaItemId: 'm1' });

    await waitFor(async () => {
      const stored = await db.notes.get('n1');
      expect(stored?.mediaItemId).toBe('m1');
      expect(stored?.pdfUrl).toBeUndefined();
    });
  });

  it('opens the reading pane for the note', () => {
    const { result } = renderHook(() => useCardController(note()));
    result.current.openBeside();
    expect(useUI.getState().mediaReadingPane).toEqual({
      source: 'note-pdf',
      noteId: 'n1',
    });
  });

  it('refresh re-fetches a URL source and is a no-op without one', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(pdfResponse())));
    const withUrl = note({ pdfUrl: 'https://example.com/x.pdf' });
    const { result } = renderHook(() => useCardController(withUrl));

    await result.current.refresh();
    await waitFor(async () => {
      expect(await db.noteUrlCache.get('n1')).toBeDefined();
    });

    await db.noteUrlCache.clear();
    const { result: noUrl } = renderHook(() => useCardController(note()));
    await noUrl.current.refresh();
    expect(await db.noteUrlCache.get('n1')).toBeUndefined();
  });

  it('toggles the picker open state', () => {
    const { result } = renderHook(() => useCardController(note()));
    expect(result.current.pickerOpen).toBe(false);
    result.current.setPickerOpen(true);
  });
});

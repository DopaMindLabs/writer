import type { MediaItem, Note, NoteUrlCache } from '@/db/schema';
import { NoteKind, NoteState } from '@/db/schema';
import { resolvePdfSource } from './resolvePdfSource';

const note = (overrides: Partial<Note>): Note => ({
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

const cache = (url: string): NoteUrlCache => ({
  noteId: 'n1',
  url,
  mime: 'application/pdf',
  size: 1,
  blob: new Blob(['%PDF']),
  pageCount: 8,
  fetchedAt: 0,
});

const mediaItem: MediaItem = {
  id: 'm1',
  spaceId: 's1',
  name: 'library.pdf',
  mime: 'application/pdf',
  size: 1,
  blob: new Blob(['%PDF']),
  pageCount: 3,
  createdAt: 0,
  updatedAt: 0,
};

describe('resolvePdfSource', () => {
  it('resolves a library source from the media item', () => {
    const resolved = resolvePdfSource(note({ mediaItemId: 'm1' }), null, mediaItem);
    expect(resolved).toEqual({ blob: mediaItem.blob, name: 'library.pdf', pageCount: 3 });
  });

  it('returns null for a library source whose item has not loaded yet', () => {
    expect(resolvePdfSource(note({ mediaItemId: 'm1' }), null, null)).toBeNull();
  });

  it('resolves a url source from a matching cache, deriving the filename', () => {
    const matchingCache = cache('https://arxiv.org/pdf/1706.03762.pdf');
    const resolved = resolvePdfSource(
      note({ pdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf' }),
      matchingCache,
      null,
    );
    expect(resolved?.name).toBe('1706.03762.pdf');
    expect(resolved?.pageCount).toBe(8);
    expect(resolved?.blob).toBe(matchingCache.blob);
  });

  it('returns null when the cache url does not match the note url', () => {
    const resolved = resolvePdfSource(
      note({ pdfUrl: 'https://arxiv.org/pdf/new.pdf' }),
      cache('https://arxiv.org/pdf/old.pdf'),
      null,
    );
    expect(resolved).toBeNull();
  });

  it('returns null when the note has no source', () => {
    expect(resolvePdfSource(note({}), null, null)).toBeNull();
  });
});

import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { useMediaItems } from './useMediaItems';

const makeMedia = (overrides: Partial<MediaItem>): MediaItem => ({
  id: 'm',
  spaceId: 's1',
  name: 'doc.pdf',
  mime: PDF_MIME,
  size: 10,
  pageCount: 1,
  blob: new Blob(['%PDF'], { type: PDF_MIME }),
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('useMediaItems', () => {
  it("returns a space's media newest-first", async () => {
    await db.media.bulkPut([
      makeMedia({ id: 'early', createdAt: 100 }),
      makeMedia({ id: 'late', createdAt: 300 }),
      makeMedia({ id: 'mid', createdAt: 200 }),
    ]);

    const { result } = renderHook(() => useMediaItems('s1'));

    await waitFor(() => {
      expect(result.current.map((m) => m.id)).toEqual(['late', 'mid', 'early']);
    });
  });

  it('scopes results to the given space', async () => {
    await db.media.bulkPut([
      makeMedia({ id: 'mine', spaceId: 's1' }),
      makeMedia({ id: 'other', spaceId: 's2' }),
    ]);

    const { result } = renderHook(() => useMediaItems('s1'));

    await waitFor(() => {
      expect(result.current.map((m) => m.id)).toEqual(['mine']);
    });
  });

  it('returns an empty list when no spaceId is given', async () => {
    await db.media.put(makeMedia({ id: 'x', spaceId: 's1' }));
    const { result } = renderHook(() => useMediaItems(undefined));
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('reacts to a newly added media item', async () => {
    const { result } = renderHook(() => useMediaItems('s1'));
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
    await db.media.put(makeMedia({ id: 'new', spaceId: 's1', createdAt: 500 }));
    await waitFor(() => {
      expect(result.current.map((m) => m.id)).toEqual(['new']);
    });
  });
});

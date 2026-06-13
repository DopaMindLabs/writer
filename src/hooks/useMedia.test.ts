import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { MediaItem } from '@/db/schema';
import { useMediaBySpace, useMediaItem } from './useMedia';

const makeItem = (overrides: Partial<MediaItem>): MediaItem => ({
  id: 'm',
  spaceId: 's1',
  name: 'a.pdf',
  mime: 'application/pdf',
  size: 1,
  blob: new Blob(['%PDF']),
  pageCount: 1,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('useMediaBySpace', () => {
  it('returns a space media newest-first', async () => {
    await db.media.bulkPut([
      makeItem({ id: 'early', name: 'early.pdf', createdAt: 100 }),
      makeItem({ id: 'late', name: 'late.pdf', createdAt: 300 }),
      makeItem({ id: 'mid', name: 'mid.pdf', createdAt: 200 }),
      makeItem({ id: 'other', spaceId: 's2', createdAt: 400 }),
    ]);

    const { result } = renderHook(() => useMediaBySpace('s1'));

    await waitFor(() => {
      expect(result.current.map((m) => m.id)).toEqual(['late', 'mid', 'early']);
    });
  });

  it('returns an empty list when no spaceId is given', async () => {
    await db.media.put(makeItem({ id: 'x' }));
    const { result } = renderHook(() => useMediaBySpace(null));
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});

describe('useMediaItem', () => {
  it('returns the item for the given id', async () => {
    await db.media.put(makeItem({ id: 'm1', name: 'one.pdf' }));
    const { result } = renderHook(() => useMediaItem('m1'));
    await waitFor(() => {
      expect(result.current?.name).toBe('one.pdf');
    });
  });

  it('returns null when no id is given', async () => {
    const { result } = renderHook(() => useMediaItem(null));
    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });
});

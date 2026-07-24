import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { PDF_MIME } from '@/data/media';
import type { MediaItem } from '@/db/schema';
import { useMediaItem } from './useMediaItem';

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

describe('useMediaItem', () => {
  it('returns the item for a known id', async () => {
    await db.media.put(makeMedia({ id: 'm1', name: 'paper.pdf' }));
    const { result } = renderHook(() => useMediaItem('m1'));
    await waitFor(() => {
      expect(result.current?.name).toBe('paper.pdf');
    });
  });

  it('resolves to null for an unknown id', async () => {
    const { result } = renderHook(() => useMediaItem('missing'));
    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('resolves to null when no id is given', async () => {
    const { result } = renderHook(() => useMediaItem(undefined));
    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('reacts when the item is deleted', async () => {
    await db.media.put(makeMedia({ id: 'm2' }));
    const { result } = renderHook(() => useMediaItem('m2'));
    await waitFor(() => {
      expect(result.current?.id).toBe('m2');
    });
    await db.media.delete('m2');
    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });
});

import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { PdfAnnotation } from '@/db/schema';
import { usePdfAnnotations } from './usePdfAnnotations';

const makeAnnotation = (overrides: Partial<PdfAnnotation>): PdfAnnotation => ({
  id: 'h',
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page: 1,
  rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }],
  quote: 'q',
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('usePdfAnnotations', () => {
  it('returns a media item highlights ordered by page then time', async () => {
    await db.pdfAnnotations.bulkPut([
      makeAnnotation({ id: 'p2', page: 2, createdAt: 100 }),
      makeAnnotation({ id: 'p1b', page: 1, createdAt: 200 }),
      makeAnnotation({ id: 'p1a', page: 1, createdAt: 100 }),
    ]);
    const { result } = renderHook(() => usePdfAnnotations('m1'));
    await waitFor(() => {
      expect(result.current.map((a) => a.id)).toEqual(['p1a', 'p1b', 'p2']);
    });
  });

  it('scopes results to the media item', async () => {
    await db.pdfAnnotations.bulkPut([
      makeAnnotation({ id: 'mine', mediaId: 'm1' }),
      makeAnnotation({ id: 'other', mediaId: 'm2' }),
    ]);
    const { result } = renderHook(() => usePdfAnnotations('m1'));
    await waitFor(() => {
      expect(result.current.map((a) => a.id)).toEqual(['mine']);
    });
  });

  it('returns an empty array without a mediaId', async () => {
    await db.pdfAnnotations.put(makeAnnotation({ id: 'x' }));
    const { result } = renderHook(() => usePdfAnnotations(undefined));
    await waitFor(() => expect(result.current).toEqual([]));
  });
});

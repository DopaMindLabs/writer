import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { PdfAnnotation } from '@/db/schema';
import { usePdfAnnotationCounts } from './usePdfAnnotationCounts';

const mark = (id: string, mediaId: string, spaceId: string): PdfAnnotation => ({
  id,
  mediaId,
  spaceId,
  kind: 'highlight',
  page: 1,
  rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }],
  quote: '',
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
});

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('usePdfAnnotationCounts', () => {
  it('returns per-media counts for the space, live', async () => {
    await db.pdfAnnotations.bulkAdd([
      mark('1', 'm1', 's1'),
      mark('2', 'm1', 's1'),
      mark('3', 'm2', 's1'),
      mark('4', 'm9', 's2'),
    ]);
    const { result } = renderHook(() => usePdfAnnotationCounts('s1'));
    await waitFor(() => expect(result.current.get('m1')).toBe(2));
    expect(result.current.get('m2')).toBe(1);
    expect(result.current.has('m9')).toBe(false);
  });

  it('is an empty map with no space', () => {
    const { result } = renderHook(() => usePdfAnnotationCounts(undefined));
    expect(result.current.size).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { markIdAtPoint } from './markHitTest';
import type { PdfAnnotation } from '@/db/schema';

const mark = (id: string, page: number, rects: PdfAnnotation['rects']): PdfAnnotation => ({
  id,
  mediaId: 'm1',
  spaceId: 's1',
  kind: 'highlight',
  page,
  rects,
  quote: 'q',
  color: 'yellow',
  author: 'me',
  createdAt: 1,
  updatedAt: 1,
});

describe('markIdAtPoint', () => {
  const marks = [
    mark('a', 1, [{ x: 0.1, y: 0.1, w: 0.2, h: 0.05 }]),
    mark('b', 1, [{ x: 0.5, y: 0.1, w: 0.2, h: 0.05 }]),
  ];

  it('returns the mark whose rect contains the point', () => {
    expect(markIdAtPoint(marks, 1, 0.15, 0.12)).toBe('a');
    expect(markIdAtPoint(marks, 1, 0.6, 0.12)).toBe('b');
  });

  it('returns null when the point is outside every rect', () => {
    expect(markIdAtPoint(marks, 1, 0.4, 0.12)).toBeNull();
    expect(markIdAtPoint(marks, 1, 0.15, 0.9)).toBeNull();
  });

  it('ignores marks on other pages', () => {
    expect(markIdAtPoint(marks, 2, 0.15, 0.12)).toBeNull();
  });

  it('prefers the later (topmost) mark when rects overlap', () => {
    const stacked = [
      mark('under', 1, [{ x: 0.1, y: 0.1, w: 0.4, h: 0.05 }]),
      mark('over', 1, [{ x: 0.2, y: 0.1, w: 0.1, h: 0.05 }]),
    ];
    expect(markIdAtPoint(stacked, 1, 0.25, 0.12)).toBe('over');
    expect(markIdAtPoint(stacked, 1, 0.15, 0.12)).toBe('under');
  });
});

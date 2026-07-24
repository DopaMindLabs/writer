import { describe, it, expect } from 'vitest';
import { rectsIntersect, subtractRect, subtractRects, trimRects, rectsOverlap } from './rectSplit';
import type { PdfRect } from './types';

const r = (x: number, y: number, w: number, h: number): PdfRect => ({ x, y, w, h });
const round = (p: PdfRect): PdfRect => ({
  x: Number(p.x.toFixed(5)),
  y: Number(p.y.toFixed(5)),
  w: Number(p.w.toFixed(5)),
  h: Number(p.h.toFixed(5)),
});

describe('rectsIntersect', () => {
  it('is true for overlapping rectangles', () => {
    expect(rectsIntersect(r(0, 0, 0.5, 0.5), r(0.25, 0.25, 0.5, 0.5))).toBe(true);
  });

  it('is false for disjoint rectangles', () => {
    expect(rectsIntersect(r(0, 0, 0.2, 0.2), r(0.5, 0.5, 0.2, 0.2))).toBe(false);
  });

  it('is false for edge-touching rectangles (no real area shared)', () => {
    expect(rectsIntersect(r(0, 0, 0.2, 0.1), r(0.2, 0, 0.2, 0.1))).toBe(false);
  });
});

describe('subtractRect', () => {
  it('returns the rectangle unchanged when they do not intersect', () => {
    const a = r(0, 0, 0.2, 0.1);
    expect(subtractRect(a, r(0.5, 0, 0.2, 0.1))).toEqual([a]);
  });

  it('returns nothing when b fully covers a', () => {
    expect(subtractRect(r(0.2, 0.1, 0.2, 0.05), r(0.1, 0.05, 0.5, 0.2))).toEqual([]);
  });

  it('leaves left and right strips when b cuts the middle of a line', () => {
    // a spans x 0.1..0.5; b covers x 0.2..0.3 across the full height.
    const parts = subtractRect(r(0.1, 0.1, 0.4, 0.05), r(0.2, 0.1, 0.1, 0.05));
    expect(parts.map(round)).toEqual([
      { x: 0.1, y: 0.1, w: 0.1, h: 0.05 },
      { x: 0.3, y: 0.1, w: 0.2, h: 0.05 },
    ]);
  });

  it('leaves only the right strip when b covers the left edge', () => {
    const parts = subtractRect(r(0.1, 0.1, 0.4, 0.05), r(0.0, 0.1, 0.2, 0.05));
    expect(parts.map(round)).toEqual([{ x: 0.2, y: 0.1, w: 0.3, h: 0.05 }]);
  });
});

describe('subtractRects / trimRects', () => {
  it('subtracts several cutters in turn', () => {
    // Remove two bites from a wide rect, leaving three strips.
    const parts = subtractRects(r(0.1, 0.1, 0.6, 0.05), [
      r(0.2, 0.1, 0.1, 0.05),
      r(0.4, 0.1, 0.1, 0.05),
    ]);
    expect(parts.map((p) => [Number(p.x.toFixed(3)), Number(p.w.toFixed(3))])).toEqual([
      [0.1, 0.1],
      [0.3, 0.1],
      [0.5, 0.2],
    ]);
  });

  it('trims every rect in a multi-line highlight', () => {
    const remaining = trimRects(
      [r(0.1, 0.1, 0.4, 0.05), r(0.1, 0.2, 0.4, 0.05)],
      [r(0.2, 0.1, 0.1, 0.05)],
    );
    // First line splits into two; the second line is untouched.
    expect(remaining).toHaveLength(3);
  });
});

describe('rectsOverlap', () => {
  it('is true when any pair intersects', () => {
    expect(rectsOverlap([r(0, 0, 0.1, 0.1)], [r(0.05, 0.05, 0.1, 0.1)])).toBe(true);
  });

  it('is false when no pair intersects', () => {
    expect(rectsOverlap([r(0, 0, 0.1, 0.1)], [r(0.5, 0.5, 0.1, 0.1)])).toBe(false);
  });
});

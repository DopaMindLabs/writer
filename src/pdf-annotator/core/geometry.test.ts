import { describe, it, expect } from 'vitest';
import {
  rectToNormalized,
  normalizedToPixels,
  clientRectsToNormalized,
  buildSelectionCapture,
} from './geometry';

const box = (x: number, y: number, w: number, h: number): DOMRect =>
  new DOMRect(x, y, w, h);

const PAGE = box(0, 0, 100, 200);

describe('pdfGeometry', () => {
  it('normalises a rect inside the page box', () => {
    const norm = rectToNormalized(box(10, 20, 30, 40), PAGE);
    expect(norm).toEqual({ x: 0.1, y: 0.1, w: 0.3, h: 0.2 });
  });

  it('clamps rects that overflow the page', () => {
    const norm = rectToNormalized(box(80, 180, 40, 40), PAGE);
    expect(norm).not.toBeNull();
    expect(norm?.x).toBeCloseTo(0.8);
    expect(norm?.w).toBeCloseTo(0.2); // clamped to 1 - x, not 0.4
    expect(norm?.h).toBeCloseTo(0.1); // clamped to 1 - y
  });

  it('rejects rects fully outside the page', () => {
    expect(rectToNormalized(box(150, 10, 20, 20), PAGE)).toBeNull();
  });

  it('rejects a rect wholly above the page', () => {
    // Regression: the old Math.max(0, …) clamp turned a negative top offset
    // into 0 while keeping the full height, recording a phantom highlight at
    // the top of the page instead of rejecting a rect that never overlaps it.
    expect(rectToNormalized(box(10, -50, 30, 40), PAGE)).toBeNull();
  });

  it('rejects a rect wholly left of the page', () => {
    expect(rectToNormalized(box(-50, 10, 30, 40), PAGE)).toBeNull();
  });

  it('clips a rect that partially overlaps the top-left corner', () => {
    const norm = rectToNormalized(box(-10, -10, 30, 30), PAGE);
    expect(norm).toEqual({ x: 0, y: 0, w: 0.2, h: 0.1 });
  });

  it('returns null for a degenerate page box', () => {
    expect(rectToNormalized(box(0, 0, 10, 10), box(0, 0, 0, 0))).toBeNull();
  });

  it('round-trips through normalizedToPixels', () => {
    const norm = rectToNormalized(box(10, 20, 30, 40), PAGE);
    expect(norm).not.toBeNull();
    const px = normalizedToPixels(norm!, 100, 200);
    expect([px.x, px.y, px.width, px.height]).toEqual([10, 20, 30, 40]);
  });

  it('drops zero-area client rects', () => {
    const rects = [box(10, 20, 30, 40), box(0, 0, 0, 10), box(0, 0, 10, 0)];
    expect(clientRectsToNormalized(rects, PAGE)).toHaveLength(1);
  });

  it('returns null for a blank quote', () => {
    expect(buildSelectionCapture([box(10, 20, 30, 40)], PAGE, '   ', 1)).toBeNull();
  });

  it('returns null when no rects survive normalisation', () => {
    expect(buildSelectionCapture([], PAGE, 'text', 1)).toBeNull();
    expect(buildSelectionCapture([box(150, 10, 20, 20)], PAGE, 'text', 1)).toBeNull();
  });

  it('builds a capture from a valid selection', () => {
    const capture = buildSelectionCapture([box(10, 20, 30, 40)], PAGE, ' hi ', 3);
    expect(capture).toEqual({
      page: 3,
      quote: ' hi ',
      rects: [{ x: 0.1, y: 0.1, w: 0.3, h: 0.2 }],
    });
  });
});
